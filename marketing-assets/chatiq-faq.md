# ChatIQ Platform - Support FAQ & Getting Started Guide

## Welcome to ChatIQ

ChatIQ is a powerful AI chatbot platform that lets you create, customize, and deploy intelligent chatbots powered by your own knowledge base. This guide answers the most common questions about getting started and using our platform.

---

## Getting Started

### How do I create an account?

Creating an account is simple and free. Visit our website and click "Sign Up" in the top right corner. You can sign up using your email address or Google account. Once you verify your email, you'll have immediate access to all free tier features.

### What's included in the free plan?

Our free plan includes a **30-day free trial** (no credit card required):

- 1 chatbot
- 1 knowledge document (unlimited content) to expand your bot's knowledge
- 500 AI messages during your first 30 days
- Basic customization
- Community support
- **30-day free trial** - After 30 days, simple responses (pre-configured responses) continue to work, but AI-powered responses require an upgrade

**Note:** The free plan is a 30-day trial. After 30 days, you'll need to upgrade to Pro or Team to continue using AI-powered responses. Simple responses (like greetings and basic Q&A) will continue to work indefinitely.

### How do I create my first bot?

To create a bot:

1. Log into your dashboard
2. Navigate to "Bots" in the sidebar
3. Click "Create Bot"
4. Fill in the bot details:
   - **Name:** Give your bot a friendly name
   - **Description:** Briefly describe what your bot does
   - **Slug:** A unique URL-friendly identifier (e.g., "support-bot")
   - **System Prompt:** Define how your bot should behave and respond
   - **Visibility:** Choose public (anyone can chat) or private
5. Click "Create Bot"

Your bot will be immediately available at `/chat/[your-slug]` and ready to accept documents.

---

## Documents & Knowledge Base

### How do I upload documents to my bot?

To add knowledge to your bot:

1. Go to "Documents" in your dashboard
2. Click "Create Document"
3. Enter a title for your document
4. Paste or type your content (or upload a file)
5. **Link to Bot(s):** Select which bots should have access to this document
6. Click "Create Document"
7. Click "Process Document" to generate embeddings

Once processed, your bot will be able to answer questions based on the document content.

### What file formats are supported?

Currently, we support:

- **Text/Markdown:** Paste directly into the document form
- **Plain text files:** .txt files
- **Markdown files:** .md files

We're working on adding support for PDFs, Word documents, and web page scraping. Stay tuned for updates!

### How long does document processing take?

Document processing typically takes 10-30 seconds depending on the size of your document. The system breaks your content into chunks and creates embeddings that allow the AI to search and retrieve relevant information. You'll see a status indicator when processing is complete.

### Can I link one document to multiple bots?

Yes! When creating or editing a document, you can select multiple bots from the "Link to Bots" dropdown. This is useful if you have shared knowledge (like company policies or FAQs) that multiple bots should know about.

### What's the difference between team documents and personal documents?

- **Team Documents:** Visible to all members of your team workspace. Great for shared knowledge bases.
- **Personal Documents:** Only visible to you. Perfect for testing or personal projects.

You can switch between team and personal workspaces using the team switcher in the dashboard.

---

## Chat & Conversations

### How do users chat with my bot?

There are two ways users can interact with your bot:

1. **Public Chat Page:** If your bot is set to public, anyone can visit `/chat/[your-bot-slug]` and start chatting
2. **API Integration:** Use our REST API to embed the bot into your own website or application

### Can I see chat history and conversations?

Yes! Navigate to "Analytics" in your dashboard to see:

- Total conversations
- Message counts
- Popular questions
- Bot performance metrics

Individual conversation history is saved and can be viewed in the chat interface when users return to the same chat session.

### How does the bot retrieve information from documents?

ChatIQ uses RAG (Retrieval-Augmented Generation) technology:

1. When a user asks a question, the system searches through your uploaded documents
2. It finds the most relevant chunks of information
3. The AI uses that context to generate an accurate, informed response
4. The bot cites the source document when possible

This ensures your bot answers based on your actual content, not generic AI responses.

---

## Billing & Plans

### How does billing work?

We offer monthly and annual billing options. Monthly plans are billed on the same date each month. Annual plans are billed once per year and include a discount. You can upgrade, downgrade, or cancel at any time—changes take effect at the start of your next billing cycle.

### What payment methods do you accept?

We accept all major credit cards (Visa, Mastercard, American Express) through Stripe. For annual enterprise plans, we also accept bank transfers and purchase orders.

### Can I get a refund?

Yes, we offer a 30-day money-back guarantee on all paid plans. If you're not satisfied, contact our support team at support@chatiq.io within 30 days of your purchase for a full refund.

### What happens if I exceed my plan limits?

If you exceed your plan's limits (e.g., number of bots, documents, or messages), you'll receive a notification. You can either upgrade your plan or remove some items to stay within your limits. We won't delete your data—you'll just need to manage your usage or upgrade.

### What are the plan limits?

**Free Plan:**

- 1 chatbot
- 1 knowledge document (unlimited content)
- 500 AI messages during your first 30 days

**Pro Plan:**

- 10 active bots
- 50 documents per bot
- 10,000 messages per month
- Priority support
- API access

**Enterprise Plan:**

- Unlimited bots
- Unlimited documents
- Unlimited messages
- Custom integrations
- Dedicated support

---

## API & Integrations

### Do you have an API?

Yes! ChatIQ offers a REST API that allows you to:

- Send messages to your bots programmatically
- Retrieve conversation history
- Manage bots and documents
- Integrate chatbots into your own applications

API access is available on Pro and Enterprise plans. You can generate API keys in the "API Keys" section of your dashboard.

### How do I generate an API key?

1. Navigate to "API Keys" in your dashboard
2. Click "Create API Key"
3. Give it a label (e.g., "Production" or "Development")
4. Select which bot(s) this key should have access to
5. Click "Create"

**Important:** Copy and save your API key immediately—you won't be able to see it again for security reasons.

### How do I use the API?

The ChatIQ API uses standard REST endpoints. Here's a basic example:

```bash
curl -X POST https://chatiq.io/api/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "message": "What are your business hours?",
    "bot_slug": "support-bot"
  }'
```

Full API documentation is available in your dashboard under "API Keys" → "Documentation".

### Can I embed my bot on my website?

Yes! You can embed your bot in two ways:

1. **Direct Link:** Share the public chat page URL (`/chat/[your-slug]`)
2. **API Integration:** Use our API to build a custom chat widget that matches your site's design

We're working on a one-line embed script for even easier integration. Coming soon!

---

## Teams & Collaboration

### Can I work with a team?

Yes! ChatIQ supports team workspaces where multiple team members can collaborate on bots and documents.

### How do I invite team members?

Team owners and admins can invite members:

1. Go to "Team" in your dashboard
2. Click "Invite Team Member"
3. Enter their email address
4. Select their role (Admin or Member)
5. Click "Send Invite"

Invited members will receive an email with a link to join your team. They can accept even if they don't have a ChatIQ account yet.

### What can team members do?

**Team Members:**

- Create and edit bots
- Upload and manage documents
- View analytics
- Chat with bots

**Team Admins:**

- Everything members can do, plus:
- Invite and remove team members
- Manage team settings
- View billing information

**Team Owners:**

- Full access to all features
- Manage billing and subscription
- Delete the team

### Can I switch between personal and team workspaces?

Yes! Use the team switcher in the top navigation to switch between your personal workspace and any teams you're a member of. Your bots and documents are organized by workspace.

---

## Troubleshooting

### My bot isn't responding correctly. What should I do?

Try these steps:

1. **Check your system prompt:** Make sure it clearly defines how the bot should behave
2. **Verify documents are processed:** Go to Documents and ensure all linked documents show "Processed" status
3. **Review document content:** Make sure your documents contain the information users are asking about
4. **Test with specific questions:** Try asking questions that should definitely be in your documents
5. **Check bot status:** Ensure your bot is set to "Active" (not "Draft" or "Archived")

If issues persist, contact support with your bot slug and example questions.

### Why can't I see my documents in the bot?

This usually happens if:

1. The document isn't linked to the bot (check document settings)
2. The document hasn't been processed yet (click "Process Document")
3. You're viewing the wrong workspace (check team switcher)

### I'm getting rate limit errors. What does this mean?

Rate limits protect our platform from abuse. If you hit a rate limit:

- **Free plan:** You've exceeded your monthly message limit (1,000 messages)
- **API users:** You're sending too many requests too quickly

Upgrade your plan or wait for the rate limit to reset. Free plan limits reset monthly.

### How do I change my bot's slug?

You can change your bot's slug in the bot settings:

1. Go to "Bots" → Select your bot → "Edit"
2. Update the "Slug" field
3. Save changes

**Note:** Changing the slug will change your bot's URL. Update any links or integrations that reference the old slug.

### Can I export my bot's conversations?

Yes! Conversation data can be exported through the Analytics dashboard. Go to "Analytics" → "Export Data" to download conversation logs in CSV or JSON format.

---

## Security & Privacy

### Is my data secure?

Yes. We use industry-standard encryption (AES-256) for data at rest and TLS 1.3 for data in transit. All data is stored in SOC 2 Type II certified data centers. We perform regular security audits and penetration testing.

### Who can see my bots and documents?

- **Public bots:** Anyone with the URL can chat with them
- **Private bots:** Only you (and your team, if applicable) can access them
- **Documents:** Only visible to you and your team members (if in a team workspace)

You control the visibility of each bot in the bot settings.

### How do I delete my account? / Can I delete my account and data?

**To delete your ChatIQ account:**

Yes, you can delete your account and all associated data at any time. Here's how to delete your account:

1. Go to "Settings" → "Account" in your dashboard
2. Scroll to "Delete Account"
3. Confirm deletion

**Warning:** This action is permanent and cannot be undone. All bots, documents, and conversations will be deleted.

**Common questions about account deletion:**

- "How do I delete my account?" → Follow the steps above
- "Can I delete my account?" → Yes, you can delete it anytime
- "How to remove my account?" → Use the Delete Account option in Settings
- "Account deletion steps" → Settings → Account → Delete Account → Confirm

If you need help with account deletion or have questions, you can also contact support@chatiq.io.

### Do you comply with GDPR?

Yes, we're fully GDPR compliant. We process personal data only as necessary to provide our services. You can request access, correction, or deletion of your personal data at any time through your account settings or by contacting support@chatiq.io.

---

## Support & Resources

### How do I contact support?

You can reach us via:

- **Email:** support@chatiq.io (we typically respond within 24 hours)
- **Help Center:** Available in your dashboard
- **Documentation:** Full guides and tutorials are available in the dashboard

### Do you offer training or onboarding?

Yes! We offer:

- **Free onboarding call:** 30-minute session with a product specialist (available for all plans)
- **Video tutorials:** Step-by-step guides in your dashboard
- **Custom training:** For enterprise customers, we provide dedicated training sessions

### Where can I find product updates?

We publish product updates in:

- **In-app notifications:** You'll see a badge when new features are released
- **Email newsletter:** Monthly digest of updates (opt-in)
- **Dashboard announcements:** Important updates appear in your dashboard

---

## Advanced Features

### What is a system prompt?

The system prompt tells your bot how to behave, what tone to use, and how to respond. For example:

> "You are a helpful customer support assistant for ChatIQ. Answer questions based on the provided documentation. Be friendly, concise, and accurate. If you don't know the answer, say so and suggest contacting support@chatiq.io."

A good system prompt is essential for getting the best results from your bot.

### Can I customize the chat interface?

Currently, the public chat page uses our default design. However, you can fully customize the experience when using our API to build your own chat interface. We're working on theme customization options for public pages—coming soon!

### How do I archive or delete a bot?

To archive a bot:

1. Go to "Bots" → Select your bot → "Edit"
2. Change status to "Archived"
3. Save

Archived bots won't appear in your active bot list but can be restored later. To permanently delete a bot, use the "Delete" option (this cannot be undone).

---

## Still Have Questions?

If you can't find the answer you're looking for, don't hesitate to reach out. Our support team is here to help, and we typically respond within a few hours during business days.

**Email:** support@chatiq.io  
**Help Center:** Available in your dashboard

---

_Last updated: November 2025_
