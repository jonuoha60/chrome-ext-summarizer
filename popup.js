import { language } from './language.js';

const translateSelect = document.querySelector('#translate');
const resultDiv = document.getElementById("result");
const summaryTypeSelect = document.getElementById("summary-type");
const summarizeBtn = document.getElementById("summarize");
const copyBtn = document.getElementById("copy-btn");
const playBtn = document.getElementById("play-audio");

let googleApiKey = ``
let currentSummary = "";

// Populate the language dropdown
Object.entries(language).forEach(([countryCode, langName]) => {
  const selected = countryCode === "en-GB" ? "selected" : "";
  const option = `<option value="${countryCode}" ${selected}>${langName}</option>`;
  translateSelect.insertAdjacentHTML('beforeend', option);
});

// Handle translation
translateSelect.addEventListener("change", async () => {
  if (!currentSummary) return;

  const lang = translateSelect.value.split('-')[0]; 

  try {
const res = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${googleApiKey}`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    q: currentSummary,
    target: lang.split('-')[0], 
    source: "en",
    format: "text"
  })
});
const data = await res.json();
const translatedText = data.data.translations[0].translatedText;

resultDiv.innerHTML = `
  <b>Translated (${lang}):</b><br>${translatedText}<br><br>
  <b>Original:</b><br>${currentSummary}
`;

  } catch (e) {
    console.error("Translation failed", e);
    resultDiv.textContent = "Translation failed.";
  }
});




// Handle summarize button click
summarizeBtn.addEventListener("click", () => {
  resultDiv.textContent = "Extracting text...";
  const summaryType = summaryTypeSelect.value;

  chrome.storage.sync.get(['geminiApiKey'], ({ geminiApiKey }) => {
    if (!geminiApiKey) {
      resultDiv.innerHTML = 'No API key was set. Click the gear icon to add one.';
      return;
    }

    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      chrome.tabs.sendMessage(tab.id, { type: "GET_ARTICLE_TEXT" }, async (response) => {
        if (!response || !response.text) {
          resultDiv.textContent = "Couldn't extract text from this page.";
          return;
        }

        try {
          const summary = await getGeminiSummary(response.text, summaryType, geminiApiKey);
          currentSummary = summary;
          resultDiv.textContent = summary;
        } catch (error) {
          console.error("Gemini API error:", error);
          resultDiv.textContent = "Gemini error: " + error.message;
        }
      });
    });
  });
});

// Fetch summary from Gemini API
async function getGeminiSummary(rawText, type, apiKey) {
  const max = 20000;
  const text = rawText.length > max ? rawText.slice(0, max) + "..." : rawText;

  const promptMap = {
    brief: `Summarize in 2-3 sentences:\n\n${text}`,
    detailed: `Give a detailed summary:\n\n${text}`,
    bullets: `Summarize in 5-7 bullet points:\n\n${text}`
  };

  const prompt = promptMap[type] || promptMap.brief;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2 }
      })
    }
  );

  if (!res.ok) {
    const { error } = await res.json();
    throw new Error(error?.message || "Request failed");
  }

  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "No summary available.";
}

// Copy summary to clipboard
copyBtn.addEventListener("click", () => {
  const txt = resultDiv.innerText;
  if (!txt) return;

  navigator.clipboard.writeText(txt).then(() => {
    const old = copyBtn.textContent;
    copyBtn.textContent = "Copied!";
    setTimeout(() => (copyBtn.textContent = old), 2000);
  });
});

let isSpeaking = false;
let currentUtterance = null;

playBtn.addEventListener("click", () => {
  const text = resultDiv.innerText;
  if (!text) return;

  if (isSpeaking) {
    speechSynthesis.cancel(); // Stop current speech
    isSpeaking = false;
    return;
  }

  currentUtterance = new SpeechSynthesisUtterance(text);
  isSpeaking = true;

  // When speech ends or is canceled, reset flag
  currentUtterance.onend = () => {
    isSpeaking = false;
  };
  currentUtterance.onerror = () => {
    isSpeaking = false;
  };

  speechSynthesis.speak(currentUtterance);
});
