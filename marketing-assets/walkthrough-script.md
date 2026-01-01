# Loom Walkthrough Script: MVP Demo

**Target Duration:** 3-5 minutes  
**Audience:** Early adopters, potential customers

---

## Pre-Recording Setup

1. **Prepare your environment:**

   - Clear browser cache or use incognito mode
   - Have a sample document ready (PDF, text file, or markdown)
   - Ensure you're logged into a clean test account
   - Close unnecessary tabs/applications
   - Set browser zoom to 100%

2. **Test the flow once** before recording to ensure everything works smoothly

3. **Prepare sample content:**

   - **Account:** Log in as support@chatiq.io
   - Bot name: "ChatIQ Support Bot"
   - Bot description: "Helps answer questions about ChatIQ platform features, billing, and getting started"
   - System prompt: "You are a helpful customer support assistant for ChatIQ, an AI chatbot platform. Answer questions based on the provided documentation. Be friendly, concise, and accurate. If you don't know the answer, suggest contacting support@chatiq.io."
   - Document: Use `chatiq-faq.md` in this folder (copy the content into the document form)
   - **Document Tags:** `support, faq, help, documentation, getting-started, billing, pricing, plans, documents, knowledge-base, api, integration, teams, collaboration, troubleshooting, security, privacy`

---

## Script

### [0:00-0:15] Introduction

**[Show dashboard homepage or landing page]**

> "Hi! Welcome to ChatIQ. I'm going to show you how easy it is to create an AI chatbot, upload your knowledge base, and start chatting—all in under 5 minutes."

**[Pause briefly, then navigate to dashboard]**

> "Let's start by creating a new bot."

---

### [0:15-1:30] Part 1: Creating a Bot

**[Navigate to Dashboard → Bots → Click "Create Bot"]**

> "First, I'll create a new chatbot. I'll give it a name, a description, and a unique URL slug."

**[Fill out the form]**

> "I'm creating a 'ChatIQ Support Bot' that will help answer questions about our platform. I'll set it as public so anyone can chat with it, and I'll add a system prompt that defines its personality and behavior."

**[Show the system prompt field]**

> "The system prompt tells the bot how to behave. I'll set it to be helpful and reference the documentation we'll upload."

**[Click "Create Bot"]**

> "And that's it! The bot is created. Now let's add some knowledge to it."

---

### [1:30-2:45] Part 2: Uploading a Document

**[Navigate to Dashboard → Documents → Click "Create Document"]**

> "Now I'll upload a document that contains the information the bot needs to answer questions. This could be a FAQ, product documentation, or any text content."

**[Fill out document form]**

> "I'll give it a title—let's call it 'ChatIQ Support FAQ'—paste the content from our FAQ document, add relevant tags like 'support, faq, help, documentation, getting-started, billing' to help the bot match this document to user questions, and most importantly—link it to the bot we just created."

**[Select the bot from the dropdown]**

> "By linking this document to the bot, the AI will be able to search through it when answering questions."

**[Click "Create Document"]**

> "The document is created and automatically processed. The system breaks it into chunks and creates embeddings—essentially making it searchable by the AI. This usually takes just a few seconds in the background."

**[Brief pause]**

> "Perfect! The document is now ready. Let's test the bot."

---

### [2:45-4:30] Part 3: Chatting with the Bot

**[Navigate to the chat page: `/chat/[bot-slug]` or click "View" on the bot]**

> "Now let's chat with our bot. I'll ask it a question that should be answered by the document we just uploaded."

**[Type a question related to the uploaded document]**

> "I'm asking: 'How do I create my first bot?'"

**[Alternative questions you could use:**

- "What's included in the free plan?"
- "How do I upload documents?"
- "Do you have an API?"
- "How does the bot retrieve information from documents?"
- "Can I work with a team?"
  **]**

**[Click "Send" and wait for response]**

> "The bot is searching through the document we uploaded and generating an answer based on that content."

**[Show the streaming response]**

> "Perfect! The bot answered using information from our document. Notice how it's not just generic responses—it's actually using the specific content we provided."

**[Ask a follow-up question]**

> "Let me ask a follow-up question to show how the conversation flows naturally."

**[Send another message]**

> "The bot maintains context from our conversation and continues to reference the uploaded documentation."

---

### [4:30-5:00] Wrap-up

**[Show the dashboard again, highlighting bots and documents]**

> "That's it! In just a few minutes, we've:
>
> - Created a custom AI chatbot
> - Uploaded knowledge base content
> - Started having intelligent conversations

> You can create multiple bots, upload unlimited documents, and customize everything to fit your needs. The bot is live and ready to use—you can share the chat link with your team or embed it on your website.

> Thanks for watching! If you have questions, feel free to reach out."

**[End recording]**

---

## Post-Recording Checklist

- [ ] Review the video for clarity and pacing
- [ ] Trim any long pauses or mistakes
- [ ] Add captions/subtitles if needed
- [ ] Export in high quality (1080p minimum)
- [ ] Save the Loom link in `marketing-assets/loom-links.md`
- [ ] Create a thumbnail image (optional)
- [ ] Share with team for feedback

---

## Tips for Recording

1. **Speak clearly and at a moderate pace** - Don't rush, but keep it moving
2. **Use your mouse cursor to highlight** what you're clicking or looking at
3. **Pause briefly** after each major action to let viewers process
4. **If you make a mistake**, pause, then continue—you can edit it out later
5. **Show, don't just tell** - Let the UI speak for itself when possible
6. **Keep it under 5 minutes** - Early adopters appreciate brevity

---

## Alternative Shorter Version (2-3 minutes)

If you want a quicker version, you can:

- Skip the detailed explanations
- Use pre-filled forms or templates
- Show the chat response immediately without waiting
- Focus on the three key actions: Create → Upload → Chat

---

## Notes

- **Update this script** as your UI/UX evolves
- **Customize the examples** to match your actual use cases
- **Record multiple takes** if needed—the first one is rarely perfect
- **Consider creating separate videos** for advanced features later
