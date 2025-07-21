function getArticleText() {
    const article = document.querySelector("article");
    if(article) return article.innerText;

    const paragraphs = Array.from(document.querySelector("p"));
    return paragraphs.map((p) => p.innerText).join("\n")

}

chrome.runtime.onMessage.addListener((req, _sender, sendResponse) => {
    if(req.type="GET_ARTICLE_TEX"){
        const text = getArticleText();
        sendResponse({ text })
    }
})