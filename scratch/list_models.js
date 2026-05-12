// import fetch from 'node-fetch';
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const apiKey = process.env.OPENAI_API_KEY;
const url = `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`;

async function listModels() {
  try {
    const response = await fetch(url);
    const data = await response.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(err);
  }
}

listModels();
