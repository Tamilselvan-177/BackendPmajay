import axios from "axios";
import FormData from "form-data";
import fs from "fs";

// ======================================
// CONFIG
// ======================================
const BASE_URL = "http://localhost:5000/api";  // your backend IP
const VILLAGE_USER = {
  username: "village123",
  password: "password123"
};

let token = "";
let houseId = "";
let villageId = "";  // filled after login

// ======================================
// HELPERS
// ======================================
const log = (name, ok = true) => {
  console.log(ok ? `✔ PASS: ${name}` : `❌ FAIL: ${name}`);
};

// ======================================
// 1. LOGIN AS VILLAGE USER
// ======================================
async function testLogin() {
  try {
    const res = await axios.post(`${BASE_URL}/auth/login`, VILLAGE_USER);
    token = res.data.token;
    villageId = res.data.village._id;

    log("Village Login");
  } catch (err) {
    log("Village Login", false);
    console.error(err.response?.data || err);
  }
}

// ======================================
// 2. GET 20 SURVEY QUESTIONS
// ======================================
async function testGetQuestions() {
  try {
    const res = await axios.get(`${BASE_URL}/surveys/questions`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (res.data.total === 20) log("Fetch Questions (20)");
    else log("Fetch Questions", false);

  } catch (err) {
    log("Fetch Questions", false);
    console.error(err.response?.data || err);
  }
}

// ======================================
// 3. CREATE HOUSE
// ======================================
async function testCreateHouse() {
  try {
    const res = await axios.post(
      `${BASE_URL}/surveys/create-house`,
      {
        villageId,
        houseNumber: "House-001"
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    houseId = res.data.house._id;

    log("Create House");
  } catch (err) {
    log("Create House", false);
    console.error(err.response?.data || err);
  }
}

// ======================================
// 4. SUBMIT SURVEY (20 mock audio files)
// ======================================
async function testSubmitSurvey() {
  try {
    const form = new FormData();

    form.append("houseId", houseId);
    form.append("villageId", villageId);

    // Add 20 mock voices (empty txt as audio)
    for (let i = 0; i < 20; i++) {
form.append("voices", fs.createReadStream("./mockAudio.wav"));
    }

    const res = await axios.post(`${BASE_URL}/surveys/submit`, form, {
      headers: {
        Authorization: `Bearer ${token}`,
        ...form.getHeaders()
      }
    });

    log("Submit Survey (20 Voices)");
  } catch (err) {
    log("Submit Survey", false);
    console.error(err.response?.data || err);
  }
}

// ======================================
// RUN ALL TESTS
// ======================================
(async () => {
  console.log("🔍 Running Backend API Test...");

  await testLogin();
  await testGetQuestions();
  await testCreateHouse();
  await testSubmitSurvey();

  console.log("🏁 Testing Completed!");
})();
