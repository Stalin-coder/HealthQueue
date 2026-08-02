# 🏥 HealthQueue – AI-Powered Smart Hospital Appointment & Queue Management System

HealthQueue is an AI-powered hospital appointment and queue management platform that helps patients find the right medical department, book appointments, and reduce waiting times through intelligent symptom analysis and digital queue management.

Built for the **Idea2Impact Offline Hackathon 2026 Finale** under **Theme 2: AI for Industry & Public Impact**.

---

# 📌 Problem Statement

Healthcare facilities often experience long waiting times, overcrowded outpatient departments, and inefficient appointment scheduling because patients are often unsure which medical department they should visit based on their symptoms. This leads to incorrect appointments, unnecessary referrals, delayed treatment, and increased workload for hospitals.

HealthQueue addresses these challenges by integrating an AI-powered Health Assistant that guides patients before booking appointments, improving healthcare accessibility and operational efficiency.

---

# 💡 Solution

HealthQueue provides a smart digital healthcare platform connecting patients, doctors, hospitals, and administrators.

Patients can describe their symptoms, and the AI analyzes them to recommend the most appropriate hospital department, assess urgency, and provide general guidance before an appointment is booked.

The platform also enables appointment booking, queue tracking, hospital management, and real-time updates, making healthcare services faster and more efficient.

---

# 🤖 AI Features

* AI-powered symptom analysis
* Intelligent hospital department recommendation
* Urgency assessment (Low / Medium / High)
* Appointment guidance
* Safe AI responses with medical disclaimer
* Powered by **Google Gemini AI**

---

# ✨ Features

## 👤 Patient

* Secure Authentication
* AI Health Assistant
* Symptom Analysis
* Department Recommendation
* Smart Appointment Booking
* Live Queue Tracking
* Appointment History
* User Dashboard

---

## 👨‍⚕️ Doctor

* View Appointments
* Manage Patient Queue
* Update Appointment Status
* Dashboard

---

## 🏥 Hospital/Admin

* Doctor Management
* Patient Management
* Appointment Management
* Queue Monitoring
* Analytics Dashboard
* Real-time Updates

---

# 🛠 Tech Stack

## Frontend

* React 18
* TypeScript
* Vite
* Tailwind CSS
* shadcn/ui

## Backend

* Supabase
* PostgreSQL
* Authentication
* Realtime Database
* Edge Functions

## Artificial Intelligence

* Google Gemini AI

## Development Tools

* Git
* GitHub
* Visual Studio Code

## Deployment

* Vercel

---

# ⚙️ Installation

Clone the repository:

```bash
git clone https://github.com/Stalin-coder/HealthQueue.git
```

Navigate to the project:

```bash
cd HealthQueue
```

Install dependencies:

```bash
npm install
```

Create a `.env` file:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

For the Supabase Edge Function, configure:

```env
GEMINI_API_KEY=your_gemini_api_key
```

Run the development server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

---

# 🚀 Deployment

The application is deployed using **Vercel**.

---

# 📱 Application Workflow

1. Patient signs in.
2. Patient describes symptoms.
3. AI Health Assistant analyzes the symptoms.
4. AI recommends the appropriate hospital department.
5. AI assigns an urgency level.
6. Patient books an appointment.
7. Hospital manages appointments and queues.
8. Doctors attend patients.
9. Administrators monitor analytics and system performance.

---

# 🎯 Expected Impact

* Reduce patient waiting time.
* Improve appointment accuracy.
* Help patients choose the correct department.
* Reduce unnecessary referrals.
* Improve hospital resource utilization.
* Enhance patient experience.
* Support digital transformation in healthcare.

---

# 🔮 Future Enhancements

* Voice-based symptom input
* Multilingual AI assistant
* Medical report summarization
* Telemedicine integration
* AI-powered appointment prediction
* Emergency ambulance integration
* Wearable device integration
* Personalized health reminders

---

# 👨‍💻 Developed By

**Stalin Arekallu**

Idea2Impact Offline Hackathon 2026 Finale

Theme: **AI for Industry & Public Impact**

---

# 📄 License

This project is developed for educational, research, and hackathon purposes.
