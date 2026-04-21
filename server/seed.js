import dns from 'dns';
dns.setServers(['8.8.8.8', '8.8.4.4']);
// ... the rest of your imports and code
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.MONGO_URI; 
const client = new MongoClient(uri);

async function seedDatabase() {
    try {
        await client.connect();
        console.log("✅ Connected to MongoDB");
        
        const db = client.db('MedSolveDB');
        const casesCollection = db.collection('MedicalCases');

        console.log("Wiping old clinical archives...");
        await casesCollection.deleteMany({});

        // ==========================================
        // 1. THE DYNAMIC CLINICAL TEMPLATES
        // ==========================================
        const caseTemplates = [
            {
                baseTitle: "The Fluttering Chest",
                bodySystem: "Cardiology",
                difficulty: "Medium",
                correctDiagnosis: "Atrial Fibrillation",
                ageRange: [65, 90], 
                validGenders: ["Male", "Female"],
                symptomPool: ["Palpitations", "Shortness of breath", "Fatigue", "Dizziness", "Lightheadedness", "Chest discomfort"],
                historyVariations: [
                    "Patient reports a sudden onset of a 'fluttering' feeling in their chest that has not subsided for 4 hours.",
                    "Brought in by family members after complaining of severe fatigue and a heart that feels like it's 'skipping beats'.",
                    "Patient felt suddenly dizzy while gardening and noticed their pulse was highly irregular and racing."
                ],
                baseVitals: { hr: 130, bp: '110/70', temp: 98.6 },
                educationalFact: "The risk of AFib increases dramatically with age, affecting about 9% of people over 65."
            },
            {
                baseTitle: "The Rebound Agony",
                bodySystem: "Gastroenterology",
                difficulty: "Easy",
                correctDiagnosis: "Appendicitis",
                ageRange: [10, 30], 
                validGenders: ["Male", "Female"],
                symptomPool: ["Right Lower Quadrant Pain", "Nausea", "Fever", "Loss of appetite", "Vomiting", "Chills"],
                historyVariations: [
                    "Patient presents with periumbilical pain that migrated to the right lower quadrant over the last 12 hours.",
                    "Arrived at the ER reporting sharp, constant pain in the lower right abdomen that worsens when coughing or walking.",
                    "Patient complains of severe abdominal pain that woke them up from sleep, accompanied by an inability to keep fluids down."
                ],
                baseVitals: { hr: 95, bp: '120/80', temp: 101.2 },
                educationalFact: "Peak incidence of appendicitis occurs in the second and third decades of life."
            },
            {
                baseTitle: "The Silent Ischemia",
                bodySystem: "Cardiology",
                difficulty: "Hard",
                correctDiagnosis: "Atypical Myocardial Infarction",
                ageRange: [60, 85], 
                validGenders: ["Female"], 
                symptomPool: ["Indigestion", "Jaw Pain", "Extreme Fatigue", "Nausea", "Cold Sweats", "Back Pain"],
                historyVariations: [
                    "Patient thought she had severe heartburn but antacids provided no relief. No classic chest crushing pain reported.",
                    "Patient woke up feeling incredibly tired and nauseous, complaining of an ache in her lower jaw and left shoulder.",
                    "Presents with sudden, unexplained cold sweats and a feeling of 'impending doom', but denies any central chest pain."
                ],
                baseVitals: { hr: 110, bp: '90/60', temp: 98.2 },
                educationalFact: "Women are more likely than men to present with atypical symptoms during an MI, such as jaw pain or nausea."
            },
            {
                baseTitle: "The Drifting Shadow",
                bodySystem: "Neurology",
                difficulty: "Hard",
                correctDiagnosis: "Ischemic Stroke",
                ageRange: [55, 85],
                validGenders: ["Male", "Female"],
                symptomPool: ["Unilateral Weakness", "Slurred Speech", "Facial Droop", "Confusion", "Loss of balance", "Vision changes"],
                historyVariations: [
                    "Patient was eating dinner when their spouse noticed the left side of their face drooping and they dropped their fork.",
                    "Patient suddenly had difficulty forming words and complained that their right arm felt incredibly heavy.",
                    "Brought in via EMS after suddenly losing balance and experiencing blurred vision in one eye."
                ],
                baseVitals: { hr: 88, bp: '160/95', temp: 98.6 },
                educationalFact: "Time is brain. 'Door-to-needle' time for tPA administration should ideally be under 60 minutes."
            },
            {
                baseTitle: "The Sudden Gasp",
                bodySystem: "Pulmonology",
                difficulty: "Medium",
                correctDiagnosis: "Pulmonary Embolism",
                ageRange: [30, 75],
                validGenders: ["Male", "Female"],
                symptomPool: ["Sudden Shortness of Breath", "Pleuritic Chest Pain", "Cough", "Leg swelling", "Sweating", "Rapid breathing"],
                historyVariations: [
                    "Patient recently returned from a 12-hour international flight. Woke up gasping for air with sharp pain when inhaling.",
                    "Patient, who recently underwent knee surgery, presents with sudden, severe chest pain that mimics a heart attack.",
                    "Arrived complaining of a sudden onset dry cough, extreme shortness of breath, and an unexplained swollen right calf."
                ],
                baseVitals: { hr: 120, bp: '110/70', temp: 99.1 },
                educationalFact: "Prolonged immobility, like long flights or bed rest, significantly increases the risk of deep vein thrombosis (DVT), which can lead to a PE."
            }
        ];

        // ==========================================
        // 2. PROCEDURAL GENERATION ARRAYS
        // ==========================================
        const firstNames = ["James", "Mary", "Robert", "Patricia", "John", "Jennifer", "Michael", "Linda", "David", "Elizabeth", "William", "Barbara", "Richard", "Susan", "Joseph", "Jessica", "Thomas", "Sarah", "Charles", "Karen"];
        const lastInitials = ["A.", "B.", "C.", "D.", "E.", "F.", "G.", "H.", "J.", "K.", "L.", "M.", "N.", "P.", "R.", "S.", "T.", "V.", "W.", "Z."];

        const fakeCases = [];

        // ==========================================
        // 3. GENERATE 1,000 HIGHLY VARIED PATIENTS
        // ==========================================
        for (let i = 0; i < 1000; i++) {
            const template = caseTemplates[Math.floor(Math.random() * caseTemplates.length)];
            
            // Generate basic demographics
            const minAge = template.ageRange[0];
            const maxAge = template.ageRange[1];
            const generatedAge = Math.floor(Math.random() * (maxAge - minAge + 1)) + minAge;
            const generatedGender = template.validGenders[Math.floor(Math.random() * template.validGenders.length)];
            
            const randomName = firstNames[Math.floor(Math.random() * firstNames.length)];
            const randomInitial = lastInitials[Math.floor(Math.random() * lastInitials.length)];
            const patientIdentifier = `${randomName} ${randomInitial} (Age ${generatedAge})`;

            // --- NEW: Generate a realistic, sequential Medical Case Number (e.g., Case #0042) ---
            const caseNumber = String(i + 1).padStart(4, '0');
            const clinicalTitle = `Case #${caseNumber}: Patient ${randomName} ${randomInitial}`;

            // --- MAD-LIBS LOGIC: Pick a random history variation and inject the name ---
            const rawHistory = template.historyVariations[Math.floor(Math.random() * template.historyVariations.length)];
            const personalizedHistory = rawHistory.replace("Patient", patientIdentifier);

            // --- MAD-LIBS LOGIC: Shuffle the symptom pool and pick 2 to 4 random symptoms ---
            const numSymptoms = Math.floor(Math.random() * 3) + 2; 
            const shuffledSymptoms = [...template.symptomPool].sort(() => 0.5 - Math.random()).slice(0, numSymptoms);

            // Generate slight vital sign variances so nobody has the exact same heart rate
            const hrVariance = Math.floor(Math.random() * 15) - 7; 
            const tempVariance = (Math.random() * 1.5 - 0.5).toFixed(1);

            fakeCases.push({
                title: clinicalTitle, // <-- Updated to use the clean Case Number!
                bodySystem: template.bodySystem,
                difficulty: template.difficulty,
                patientAge: generatedAge,
                patientGender: generatedGender,
                patientHistory: personalizedHistory, 
                symptoms: shuffledSymptoms, 
                vitals: { 
                    heartRate: template.baseVitals.hr + hrVariance, 
                    bloodPressure: template.baseVitals.bp, 
                    temperature: parseFloat((template.baseVitals.temp + parseFloat(tempVariance)).toFixed(1)) 
                },
                correctDiagnosis: template.correctDiagnosis,
                educationalFact: template.educationalFact,
                createdAt: new Date(Date.now() - Math.floor(Math.random() * 10000000000)) 
            });
        }

        console.log("Seeding 1,000 highly dynamic, procedurally generated cases...");
        await casesCollection.insertMany(fakeCases);
        console.log("🎉 Database seeded successfully!");

    } catch (err) {
        console.error("❌ Error seeding database:", err);
    } finally {
        await client.close();
    }
}

seedDatabase();