import express from 'express';
import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';
import session from 'express-session';
import passport from 'passport';
import LocalStrategy from 'passport-local';
import bcrypt from 'bcrypt';
import cors from 'cors';
import dns from 'dns';

dns.setServers(['8.8.8.8', '8.8.4.4']);

// Load environment variables
dotenv.config();

const app = express();
app.use(
    cors({
        origin: 'http://localhost:5173', // Your Vite frontend URL
        credentials: true, // This allows cookies/sessions to be sent back and forth!
    })
);
const PORT = process.env.PORT || 5000;

// ==========================================
// 1. MANUAL CORS MIDDLEWARE (Rubric Requirement)
// ==========================================
app.use((req, res, next) => {
    // Must match your Vite React frontend URL exactly for cookies to work
    const allowedOrigin = 'http://localhost:5173';

    res.header('Access-Control-Allow-Origin', allowedOrigin);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    next();
});

// Middleware to parse JSON bodies
app.use(express.json());
app.use(
    session({
        secret: 'medsolve_super_secret_key', // In production, this goes in your .env file!
        resave: false,
        saveUninitialized: false,
        cookie: { secure: false }, // Set to true if using HTTPS, but false for localhost
    })
);
app.use(passport.initialize());
app.use(passport.session());

// ==========================================
// 2. MONGODB NATIVE DRIVER SETUP
// ==========================================
const client = new MongoClient(process.env.MONGO_URI);
let db;

async function connectDB() {
    try {
        await client.connect();
        db = client.db('MedSolveDB');
        console.log('✅ Connected to MongoDB natively');
    } catch (err) {
        console.error('❌ MongoDB connection error:', err);
    }
}
connectDB();

// ==========================================
// 3. SESSION & PASSPORT CONFIGURATION
// ==========================================
app.use(
    session({
        secret: process.env.SESSION_SECRET || 'super_secret_medsolve_key',
        resave: false,
        saveUninitialized: false,
        cookie: {
            secure: false, // Set to true if using HTTPS in production
            httpOnly: true,
            maxAge: 1000 * 60 * 60 * 24, // 1 day
        },
    })
);

app.use(passport.initialize());
app.use(passport.session());

// Passport Local Strategy (Login Logic)
passport.use(
    new LocalStrategy(async (username, password, done) => {
        try {
            const usersCollection = db.collection('Users');
            const user = await usersCollection.findOne({ username: username });

            if (!user) {
                return done(null, false, { message: 'Incorrect username.' });
            }

            const match = await bcrypt.compare(password, user.password);
            if (!match) {
                return done(null, false, { message: 'Incorrect password.' });
            }

            return done(null, user);
        } catch (err) {
            return done(err);
        }
    })
);

// Serialize user (Save user ID to session)
passport.serializeUser((user, done) => {
    done(null, user._id.toString());
});

// Deserialize user (Get user from DB using ID in session)
passport.deserializeUser(async (id, done) => {
    try {
        const usersCollection = db.collection('Users');
        const user = await usersCollection.findOne({ _id: new ObjectId(id) });
        // Don't send the password hash back with the user object
        if (user) delete user.password;
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});

// ==========================================
// 4. AUTHENTICATION ROUTES
// ==========================================

// Register a new Doctor/Intern
app.post('/api/register', async (req, res) => {
    try {
        const { username, password } = req.body;

        // 1. Check if user already exists
        const usersCollection = db.collection('Users');
        const existingUser = await usersCollection.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ error: 'Username already taken.' });
        }

        // 2. Hash the password (NEVER save plain text passwords!)
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 3. Save the new user
        await usersCollection.insertOne({
            username,
            password: hashedPassword,
            role: 'Intern',
            casesSolved: 0,
        });

        res.status(201).json({ message: 'Registration successful' });
    } catch (err) {
        console.error('Registration Error:', err);
        res.status(500).json({ error: 'Internal server error during registration.' });
    }
});

// ==========================================
// PASSPORT AUTHENTICATION SETUP
// ==========================================

// 1. The Strategy (The Bouncer)
passport.use(
    new LocalStrategy(async (username, password, done) => {
        try {
            const usersCollection = db.collection('Users');
            const user = await usersCollection.findOne({ username });

            if (!user) {
                return done(null, false, { message: 'Incorrect username.' });
            }

            // Compare the typed password with the hashed password in the DB
            const passwordsMatch = await bcrypt.compare(password, user.password);
            if (!passwordsMatch) {
                return done(null, false, { message: 'Incorrect password.' });
            }

            return done(null, user); // Success! Let them in.
        } catch (err) {
            return done(err);
        }
    })
);

// 2. Serialize User (Save their ID to the session cookie)
passport.serializeUser((user, done) => {
    done(null, user._id.toString());
});

// 3. Deserialize User (Read the cookie and find the user in the DB)
passport.deserializeUser(async (id, done) => {
    try {
        const usersCollection = db.collection('Users');
        const user = await usersCollection.findOne({ _id: new ObjectId(id) });
        done(null, user);
    } catch (err) {
        done(err);
    }
});

// 4. The Login Route
app.post('/api/login', (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
        if (err) return res.status(500).json({ error: 'Server error' });
        if (!user) return res.status(401).json({ error: 'Invalid username or password' });

        req.logIn(user, (err) => {
            if (err) return res.status(500).json({ error: 'Login failed' });
            return res.json({ message: 'Login successful', username: user.username });
        });
    })(req, res, next);
});
// Logout Route
app.post('/api/logout', (req, res, next) => {
    req.logout((err) => {
        if (err) return res.status(500).json({ error: 'Logout failed' });
        // Clear the session cookie!
        res.clearCookie('connect.sid');
        return res.json({ message: 'Logged out successfully' });
    });
});

// Get Medical Cases for the Frontend
app.get('/api/cases', async (req, res) => {
    try {
        const casesCollection = db.collection('MedicalCases');
        const cases = await casesCollection.find({}).limit(50).toArray();
        res.json(cases);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch cases' });
    }
});
// Get a Single Medical Case by ID
app.get('/api/cases/:id', async (req, res) => {
    try {
        const casesCollection = db.collection('MedicalCases');
        // We use ObjectId to convert the string ID from the URL into a MongoDB ID
        const singleCase = await casesCollection.findOne({ _id: new ObjectId(req.params.id) });

        if (!singleCase) return res.status(404).json({ error: 'Case not found' });
        res.json(singleCase);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch case file' });
    }
});
// ==========================================
// CRUD OPERATIONS FOR MEDICAL CASES
// ==========================================

// CREATE: Add a brand new case file
app.post('/api/cases', async (req, res) => {
    try {
        const casesCollection = db.collection('MedicalCases');
        // Add a timestamp to the incoming data
        const newCase = { ...req.body, createdAt: new Date() };
        const result = await casesCollection.insertOne(newCase);
        res.status(201).json(result);
    } catch (err) {
        res.status(500).json({ error: 'Failed to create case' });
    }
});

// UPDATE: Edit an existing case file
app.put('/api/cases/:id', async (req, res) => {
    try {
        const casesCollection = db.collection('MedicalCases');
        // We pull out _id so we don't accidentally overwrite the MongoDB ID
        const { _id, ...updatedData } = req.body;

        await casesCollection.updateOne(
            { _id: new ObjectId(req.params.id) },
            { $set: updatedData }
        );
        res.json({ message: 'Case updated successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update case' });
    }
});

// DELETE: Remove a case file permanently
app.delete('/api/cases/:id', async (req, res) => {
    // 1. Are they logged in?
    if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Must be logged in to delete.' });
    }
    // 2. Are they an Attending Physician?
    if (req.user.role !== 'Attending') {
        return res.status(403).json({ error: 'Unauthorized: Only Attendings can delete cases.' });
    }

    try {
        const casesCollection = db.collection('MedicalCases');
        await casesCollection.deleteOne({ _id: new ObjectId(req.params.id) });
        res.json({ message: 'Case deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete case' });
    }
});
// Get Current Logged-in User's Stats
app.get('/api/me', async (req, res) => {
    // Passport adds req.isAuthenticated() to check if the cookie is valid!
    if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Not logged in' });
    }

    try {
        // Fetch fresh user data to get their current score
        const usersCollection = db.collection('Users');
        const user = await usersCollection.findOne({ _id: new ObjectId(req.user._id) });

        res.json({
            username: user.username,
            role: user.role,
            casesSolved: user.casesSolved,
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch user stats' });
    }
});

// Increase Score when a Case is Solved
app.post('/api/user/score', async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Not logged in' });
    }

    try {
        const usersCollection = db.collection('Users');
        // Find the logged-in user and increment their score by 1
        await usersCollection.updateOne(
            { _id: new ObjectId(req.user._id) },
            { $inc: { casesSolved: 1 } }
        );
        res.json({ message: 'Score increased!' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update score' });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`🚀 MedSolve Server running on http://localhost:${PORT}`);
});
