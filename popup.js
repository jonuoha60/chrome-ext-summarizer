document.getElementById("summarize").addEventListener("click", () => {
    const resultDiv = document.getElementById("result");
    resultDiv.textContent = "Extracting text...";
    const summaryType = document.getElementById("summary-type").value;

    chrome.storage.sync.get(['geminiApiKey'], ({ geminiApiKey }) => {
        if (!geminiApiKey) {
            resultDiv.innerHTML = 'No API key was set. Click the gear icon to add one.';
            return;
        }

        // Ask content script for the page text
        chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
            chrome.tabs.sendMessage(tab.id, { type: "GET_ARTICLE_TEXT" }, async ({ text }) => {
                if (!text) {
                    resultDiv.textContent = "Couldn't extract text from this page.";
                    return;
                }

                try {
                    const summary = await getGeminiSummary(text, summaryType, geminiApiKey);
                    resultDiv.textContent = summary;
                } catch (error) {
                    resultDiv.textContent = "Gemini error: " + error.message;
                }
            });
        });
    });
});

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
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "No summary";
}

document.getElementById("copy-btn").addEventListener("click", () => {
    const txt = document.getElementById("result").innerText;
    if(!txt) return;

    navigator.clipboard.writeText(txt).then(() =>{
        const btn = document.getElementById("copy-btn")
        const old = btn.textContent;
        btn.textContent = "Copied!"
        setTimeout(() => (btn.textContent = old), 2000)
    })
})
