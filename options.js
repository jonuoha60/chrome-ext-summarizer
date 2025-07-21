document.addEventListener("DOMContentLoaded", () => {
    const input = document.getElementById("api-key");
    const saveBtn = document.getElementById("save-button");
    const message = document.getElementById("success-message");

    if (!input || !saveBtn || !message) return;

    chrome.storage.sync.get(["geminiApiKey"], ({ geminiApiKey }) => {
        if (geminiApiKey) input.value = geminiApiKey;
    });

    saveBtn.addEventListener("click", () => {
        const apiKey = input.value.trim();
        if (!apiKey) return;

        chrome.storage.sync.set({ geminiApiKey: apiKey }, () => {
            message.style.display = "block";
            setTimeout(() => window.close(), 1000);
        });
    });
});
