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
const PORT = process.env.PORT || 5000;

// ==========================================
// 1. TRUST PROXY (Crucial for Render)
// ==========================================
// Render routes traffic through a proxy. This tells Express to trust that proxy
// so it can safely send secure cross-site cookies over HTTPS.
app.set('trust proxy', 1);

// ==========================================
// 2. CORS MIDDLEWARE
// ==========================================
const allowedOrigins = [
    'http://localhost:5173',
    'https://medsolve-eosin.vercel.app' // NOTE: Ensure this exactly matches your Vercel URL!
];

app.use(
    cors({
        origin: function (origin, callback) {
            // Allow requests with no origin (like mobile apps or curl requests)
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                callback(new Error('Not allowed by CORS'));
            }
        },
        credentials: true, // This allows cookies/sessions to be sent cross-origin!
    })
);

// Middleware to parse JSON bodies
app.use(express.json());

// ==========================================
// 3. SESSION & PASSPORT CONFIGURATION
// ==========================================
app.use(
    session({
        secret: process.env.SESSION_SECRET || 'medsolve_super_secret_key',
        resave: false,
        saveUninitialized: false,
        cookie: {
            // In production, must be true for cross-site cookies. False for localhost.
            secure: process.env.NODE_ENV === 'production',
            // 'none' allows cookies to be sent from Vercel to Render. 'lax' for localhost.
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            httpOnly: true,
            maxAge: 1000 * 60 * 60 * 24, // 1 day
        },
    })
);

app.use(passport.initialize());
app.use(passport.session());

// ==========================================
// 4. MONGODB NATIVE DRIVER SETUP
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
// 5. PASSPORT LOCAL STRATEGY
// ==========================================
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

passport.serializeUser((user, done) => {
    done(null, user._id.toString());
});

passport.deserializeUser(async (id, done) => {
    try {
        const usersCollection = db.collection('Users');
        const user = await usersCollection.findOne({ _id: new ObjectId(id) });
        if (user) delete user.password;
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});

// ==========================================
// 6. AUTHENTICATION ROUTES
// ==========================================
app.post('/api/register', async (req, res) => {
    try {
        const { username, password } = req.body;

        const usersCollection = db.collection('Users');
        const existingUser = await usersCollection.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ error: 'Username already taken.' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

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

app.post('/api/logout', (req, res, next) => {
    req.logout((err) => {
        if (err) return res.status(500).json({ error: 'Logout failed' });
        res.clearCookie('connect.sid');
        return res.json({ message: 'Logged out successfully' });
    });
});

// ==========================================
// 7. CRUD OPERATIONS FOR MEDICAL CASES
// ==========================================
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

app.get('/api/cases/:id', async (req, res) => {
    try {
        const casesCollection = db.collection('MedicalCases');
        const singleCase = await casesCollection.findOne({ _id: new ObjectId(req.params.id) });

        if (!singleCase) return res.status(404).json({ error: 'Case not found' });
        res.json(singleCase);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch case file' });
    }
});

app.post('/api/cases', async (req, res) => {
    try {
        const casesCollection = db.collection('MedicalCases');
        const newCase = { ...req.body, createdAt: new Date() };
        const result = await casesCollection.insertOne(newCase);
        res.status(201).json(result);
    } catch (err) {
        res.status(500).json({ error: 'Failed to create case' });
    }
});

app.put('/api/cases/:id', async (req, res) => {
    try {
        const casesCollection = db.collection('MedicalCases');
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

app.delete('/api/cases/:id', async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Must be logged in to delete.' });
    }
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

// ==========================================
// 8. USER DATA ROUTES
// ==========================================
app.get('/api/me', async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Not logged in' });
    }

    try {
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

app.post('/api/user/score', async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Not logged in' });
    }

    try {
        const usersCollection = db.collection('Users');
        await usersCollection.updateOne(
            { _id: new ObjectId(req.user._id) },
            { $inc: { casesSolved: 1 } }
        );
        res.json({ message: 'Score increased!' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update score' });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 MedSolve Server running on port ${PORT}`);
});