require('dotenv').config();
const mongoose = require('mongoose');
const IndustryRole = require('./models/IndustryRole');

const mockRoles = [
  { title: "Full Stack Developer", category: "Software Engineering", demandScore: 92, avgSalary: { min: 600000, max: 1500000 }, topCompanies: ["Amazon", "TCS", "Infosys", "Atlassian"], requiredSkills: ["HTML", "CSS", "JavaScript", "React", "Node.js", "MongoDB", "Git"] },
  { title: "Frontend Developer", category: "Software Engineering", demandScore: 85, avgSalary: { min: 500000, max: 1200000 }, topCompanies: ["Flipkart", "Swiggy", "Zomato", "Paytm"], requiredSkills: ["HTML", "CSS", "JavaScript", "React", "Redux", "TypeScript"] },
  { title: "Backend Developer", category: "Software Engineering", demandScore: 87, avgSalary: { min: 550000, max: 1300000 }, topCompanies: ["Amazon", "Microsoft", "PayPal", "Freshworks"], requiredSkills: ["Node.js", "Express", "MongoDB", "SQL", "API Design", "Docker"] },
  { title: "Data Scientist", category: "Data", demandScore: 88, avgSalary: { min: 700000, max: 1800000 }, topCompanies: ["Fractal", "Mu Sigma", "Amazon", "IBM"], requiredSkills: ["Python", "SQL", "Pandas", "Machine Learning", "Statistics", "Data Visualization"] },
  { title: "ML Engineer", category: "Artificial Intelligence", demandScore: 95, avgSalary: { min: 800000, max: 2000000 }, topCompanies: ["Google", "Microsoft", "Meta", "Nvidia"], requiredSkills: ["Python", "PyTorch", "TensorFlow", "SQL", "Docker", "Model Deployment", "Git"] },
  { title: "DevOps Engineer", category: "Infrastructure", demandScore: 83, avgSalary: { min: 650000, max: 1600000 }, topCompanies: ["Wipro", "Infosys", "Amazon", "Google"], requiredSkills: ["Linux", "AWS", "Docker", "Kubernetes", "CI/CD", "Terraform"] },
  { title: "Cloud Engineer", category: "Cloud Computing", demandScore: 80, avgSalary: { min: 700000, max: 1700000 }, topCompanies: ["Google", "Microsoft", "AWS", "Oracle"], requiredSkills: ["AWS", "Azure", "GCP", "Cloud Security", "DevOps", "Python"] },
  { title: "Cybersecurity Analyst", category: "Security", demandScore: 78, avgSalary: { min: 600000, max: 1500000 }, topCompanies: ["KPMG", "EY", "TCS", "Accenture"], requiredSkills: ["Network Security", "Penetration Testing", "Python", "Firewalls", "SIEM"] },
  { title: "UI/UX Designer", category: "Design", demandScore: 75, avgSalary: { min: 500000, max: 1200000 }, topCompanies: ["Adobe", "Zeta", "CRED", "Swiggy"], requiredSkills: ["Figma", "Sketch", "User Research", "Wireframing", "Prototyping"] },
  { title: "Mobile App Developer", category: "Software Engineering", demandScore: 82, avgSalary: { min: 600000, max: 1400000 }, topCompanies: ["Paytm", "Dream11", "Byju's", "Ola"], requiredSkills: ["Flutter", "React Native", "Android", "iOS", "Dart", "Kotlin", "Swift"] },
  { title: "Product Manager", category: "Product", demandScore: 77, avgSalary: { min: 900000, max: 2500000 }, topCompanies: ["Flipkart", "Amazon", "Google", "Freshworks"], requiredSkills: ["Product Strategy", "Roadmapping", "User Research", "Analytics", "Communication"] },
  { title: "QA Engineer", category: "Quality Assurance", demandScore: 70, avgSalary: { min: 500000, max: 1100000 }, topCompanies: ["TCS", "Cognizant", "Wipro", "Capgemini"], requiredSkills: ["Manual Testing", "Automation", "Selenium", "Jest", "Bug Tracking"] },
  { title: "Business Analyst", category: "Business", demandScore: 74, avgSalary: { min: 600000, max: 1300000 }, topCompanies: ["Deloitte", "EY", "KPMG", "Accenture"], requiredSkills: ["Excel", "SQL", "Data Analysis", "Presentation", "Domain Knowledge"] },
  { title: "Blockchain Developer", category: "Emerging Tech", demandScore: 68, avgSalary: { min: 800000, max: 1800000 }, topCompanies: ["Polygon", "CoinDCX", "WazirX", "Tata Consultancy"], requiredSkills: ["Solidity", "Ethereum", "Smart Contracts", "Web3.js", "Cryptography"] },
  { title: "Game Developer", category: "Entertainment", demandScore: 65, avgSalary: { min: 500000, max: 1200000 }, topCompanies: ["Nazara", "Ubisoft", "EA", "Zynga"], requiredSkills: ["Unity", "C#", "Game Design", "3D Modeling", "Animation"] },
  { title: "Embedded Systems Engineer", category: "Hardware", demandScore: 72, avgSalary: { min: 700000, max: 1500000 }, topCompanies: ["Bosch", "Siemens", "Honeywell", "Tata Elxsi"], requiredSkills: ["C", "C++", "Microcontrollers", "RTOS", "PCB Design"] },
  { title: "AR/VR Developer", category: "Emerging Tech", demandScore: 60, avgSalary: { min: 600000, max: 1300000 }, topCompanies: ["TCS", "Accenture", "Infosys", "Zynga"], requiredSkills: ["Unity", "C#", "3D Modeling", "ARKit", "ARCore"] },
  { title: "AI Researcher", category: "Artificial Intelligence", demandScore: 66, avgSalary: { min: 1000000, max: 3000000 }, topCompanies: ["Google", "OpenAI", "Microsoft", "IBM"], requiredSkills: ["Deep Learning", "Python", "Research", "Paper Writing", "PyTorch"] },
  { title: "Network Engineer", category: "Infrastructure", demandScore: 69, avgSalary: { min: 600000, max: 1200000 }, topCompanies: ["Cisco", "Juniper", "Airtel", "Reliance Jio"], requiredSkills: ["Networking", "Cisco", "Routing", "Switching", "Firewalls"] },
  { title: "Technical Writer", category: "Content", demandScore: 55, avgSalary: { min: 400000, max: 900000 }, topCompanies: ["Red Hat", "Zoho", "Freshworks", "Oracle"], requiredSkills: ["Writing", "Documentation", "APIs", "Markdown", "Research"] },
  { title: "IT Support Specialist", category: "Support", demandScore: 58, avgSalary: { min: 350000, max: 800000 }, topCompanies: ["Wipro", "TCS", "Infosys", "Dell"], requiredSkills: ["Troubleshooting", "Windows", "Linux", "Customer Service", "Networking"] },
  { title: "Data Engineer", category: "Data", demandScore: 81, avgSalary: { min: 700000, max: 1600000 }, topCompanies: ["Amazon", "Google", "Snowflake", "TCS"], requiredSkills: ["Python", "SQL", "ETL", "Big Data", "Spark", "Data Warehousing"] },
  { title: "Database Administrator", category: "Data", demandScore: 63, avgSalary: { min: 600000, max: 1200000 }, topCompanies: ["Oracle", "IBM", "TCS", "Infosys"], requiredSkills: ["SQL", "Oracle", "Backup", "Performance Tuning", "Security"] },
  { title: "Robotics Engineer", category: "Robotics", demandScore: 67, avgSalary: { min: 800000, max: 1700000 }, topCompanies: ["ABB", "Tata Motors", "ISRO", "Bharat Electronics"], requiredSkills: ["Robotics", "C++", "Python", "ROS", "Sensors"] },
  { title: "Web Designer", category: "Design", demandScore: 59, avgSalary: { min: 400000, max: 900000 }, topCompanies: ["Wix", "Zoho", "Freshworks", "Adobe"], requiredSkills: ["HTML", "CSS", "Photoshop", "Illustrator", "UI Design"] },
  { title: "SEO Specialist", category: "Marketing", demandScore: 54, avgSalary: { min: 350000, max: 800000 }, topCompanies: ["Zomato", "Swiggy", "CRED", "Freshworks"], requiredSkills: ["SEO", "Google Analytics", "Content", "Link Building", "Keyword Research"] },
  { title: "Digital Marketing Analyst", category: "Marketing", demandScore: 61, avgSalary: { min: 400000, max: 1000000 }, topCompanies: ["CRED", "Zomato", "Swiggy", "Paytm"], requiredSkills: ["Digital Marketing", "Google Ads", "SEO", "Analytics", "Content"] },
  { title: "Content Creator", category: "Content", demandScore: 50, avgSalary: { min: 300000, max: 700000 }, topCompanies: ["YouTube", "Instagram", "LinkedIn", "Medium"], requiredSkills: ["Video Editing", "Writing", "Social Media", "Branding", "Creativity"] },
  { title: "Other", category: "Other", demandScore: 40, avgSalary: { min: 200000, max: 500000 }, topCompanies: ["Various"], requiredSkills: ["Adaptability", "Learning", "Communication"] }
];

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('✅ Connected to MongoDB for Seeding...');
    await IndustryRole.deleteMany({}); // Clears out old data
    await IndustryRole.insertMany(mockRoles);
    console.log('🌱 Database Seeded Successfully with Industry Roles!');
    process.exit();
  })
  .catch(err => {
    console.error('❌ Seeding Error:', err);
    process.exit(1);
  });