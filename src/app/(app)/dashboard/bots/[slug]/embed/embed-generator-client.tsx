"use client";

import { useState, useEffect, useTransition, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import {
  Copy,
  Check,
  AlertTriangle,
  ExternalLink,
  Plus,
  ChevronDown,
  ChevronUp,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import type { Bot } from "@/types/bot";
import { createApiKey } from "@/app/actions/api/create-api-key";
import { getUserApiKeys } from "@/app/actions/api/api-keys";

interface EmbedGeneratorClientProps {
  bot: Bot;
  initialApiKeys: Array<{
    id: string;
    label: string | null;
    key: string; // Masked
    created_at: string;
    active: boolean;
    bot_id: string;
  }>;
}

type Position = "bottom-right" | "bottom-left" | "inline";
type Size = "small" | "medium" | "large";

export default function EmbedGeneratorClient({
  bot,
  initialApiKeys,
}: EmbedGeneratorClientProps) {
  const [apiKeys, setApiKeys] = useState(initialApiKeys);
  const [selectedApiKeyId, setSelectedApiKeyId] = useState<string>("");
  const [selectedApiKey, setSelectedApiKey] = useState<string>("");
  const [position, setPosition] = useState<Position>("bottom-right");
  const [primaryColor, setPrimaryColor] = useState("#10b981");
  const [size, setSize] = useState<Size>("medium");
  const [headerTitle, setHeaderTitle] = useState("Chat with us");
  const [sourceLabel, setSourceLabel] = useState("web");
  const [embedId, setEmbedId] = useState(bot.slug);
  const [persistConversation, setPersistConversation] = useState(false);
  const [conversationStorageKey, setConversationStorageKey] = useState("");
  const [allowedDomains, setAllowedDomains] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [createKeyDialogOpen, setCreateKeyDialogOpen] = useState(false);
  const [newKeyLabel, setNewKeyLabel] = useState("");
  const [isPending, startTransition] = useTransition();
  const [instructionsOpen, setInstructionsOpen] = useState(false);
  const [frameworkSearch, setFrameworkSearch] = useState("");
  const previewContainerRef = useRef<HTMLDivElement>(null);

  // Filter API keys for this bot
  const botApiKeys = apiKeys.filter((key) => key.bot_id === bot.id);

  // Get the actual API key value (we'll need to store it when creating)
  // For existing keys, we only have the masked version, so we'll need to
  // create a new key or use one that was just created
  useEffect(() => {
    // If we have a selected key ID but no actual key value,
    // we need to prompt user to create a new key or use an existing one
    if (selectedApiKeyId && !selectedApiKey) {
      // For now, we'll require creating a new key for widget embedding
      // since we can't retrieve the plain key value
    }
  }, [selectedApiKeyId, selectedApiKey]);

  // Generate script tag
  const generateScriptTag = () => {
    if (!selectedApiKey) {
      return "";
    }

    const persistAttr = persistConversation
      ? `        data-persist-conversation="true"\n`
      : "";
    const storageKeyAttr =
      persistConversation && conversationStorageKey
        ? `        data-conversation-storage-key="${conversationStorageKey.replace(
            /"/g,
            "&quot;"
          )}"\n`
        : "";

    let script = `<script src="https://www.chatiq.io/widget.js"\n`;
    script += `        data-bot-slug="${bot.slug}"\n`;
    script += `        data-api-key="${selectedApiKey}"\n`;
    script += `        data-position="${position}"\n`;
    script += `        data-primary-color="${primaryColor}"\n`;
    script += `        data-source-label="${sourceLabel.replace(
      /"/g,
      "&quot;"
    )}"\n`;
    if (embedId) {
      script += `        data-embed-id="${embedId.replace(/"/g, "&quot;")}"\n`;
    }
    if (size !== "medium") {
      script += `        data-size="${size}"\n`;
    }
    if (headerTitle !== "Chat with us") {
      script += `        data-header-title="${headerTitle.replace(
        /"/g,
        "&quot;"
      )}"\n`;
    }
    script += persistAttr;
    script += storageKeyAttr;
    script += `        async></script>`;

    return script;
  };

  const scriptTag = generateScriptTag();

  // Framework/platform instructions data
  const frameworks = [
    {
      name: "Next.js (App Router)",
      category: "Web Frameworks",
      keywords: ["nextjs", "next.js", "app router", "react", "next"],
      description: "Add this to your root layout file (app/layout.tsx):",
      code: `import Script from 'next/script'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Script
          src="https://www.chatiq.io/widget.js"
          data-bot-slug="${bot.slug}"
          data-api-key="${selectedApiKey}"
          data-position="${position}"
          data-primary-color="${primaryColor}"
          data-source-label="${sourceLabel.replace(/"/g, "&quot;")}"
          data-embed-id="${embedId.replace(/"/g, "&quot;")}"
          ${size !== "medium" ? `data-size="${size}"` : ""}
          ${
            headerTitle !== "Chat with us"
              ? `data-header-title="${headerTitle.replace(/"/g, "&quot;")}"`
              : ""
          }
          ${persistConversation ? `data-persist-conversation="true"` : ""}
          ${
            persistConversation && conversationStorageKey
              ? `data-conversation-storage-key="${conversationStorageKey.replace(
                  /"/g,
                  "&quot;"
                )}"`
              : ""
          }
          strategy="afterInteractive"
        />
      </body>
    </html>
  )
}`,
    },
    {
      name: "Next.js (Pages Router)",
      category: "Web Frameworks",
      keywords: ["nextjs", "next.js", "pages router", "react", "next"],
      description: "Add this to your pages/_app.tsx:",
      code: `import Script from 'next/script'

export default function App({ Component, pageProps }) {
  return (
    <>
      <Component {...pageProps} />
      <Script
        src="https://www.chatiq.io/widget.js"
        data-bot-slug="${bot.slug}"
        data-api-key="${selectedApiKey}"
        data-position="${position}"
        data-primary-color="${primaryColor}"
        data-source-label="${sourceLabel.replace(/"/g, "&quot;")}"
        data-embed-id="${embedId.replace(/"/g, "&quot;")}"
        ${size !== "medium" ? `data-size="${size}"` : ""}
        ${
          headerTitle !== "Chat with us"
            ? `data-header-title="${headerTitle.replace(/"/g, "&quot;")}"`
            : ""
        }
        ${persistConversation ? `data-persist-conversation="true"` : ""}
        ${
          persistConversation && conversationStorageKey
            ? `data-conversation-storage-key="${conversationStorageKey.replace(
                /"/g,
                "&quot;"
              )}"`
            : ""
        }
        strategy="afterInteractive"
      />
    </>
  )
}`,
    },
    {
      name: "React (CRA, Vite, etc.)",
      category: "Web Frameworks",
      keywords: ["react", "create react app", "vite", "cra"],
      description: "Add to public/index.html or use useEffect:",
      code: `// Option 1: Add to public/index.html before </body>
${scriptTag
  .split("\n")
  .map((line) => "  " + line)
  .join("\n")}

// Option 2: Load dynamically in a component
useEffect(() => {
  const script = document.createElement('script');
  script.src = 'https://www.chatiq.io/widget.js';
  script.setAttribute('data-bot-slug', '${bot.slug}');
  script.setAttribute('data-api-key', '${selectedApiKey}');
  script.setAttribute('data-position', '${position}');
  script.setAttribute('data-primary-color', '${primaryColor}');
  script.setAttribute('data-source-label', '${sourceLabel.replace(
    /'/g,
    "\\'"
  )}');
  script.setAttribute('data-embed-id', '${embedId.replace(/'/g, "\\'")}');
  ${size !== "medium" ? `script.setAttribute('data-size', '${size}');` : ""}
  ${
    headerTitle !== "Chat with us"
      ? `script.setAttribute('data-header-title', '${headerTitle.replace(
          /'/g,
          "\\'"
        )}');`
      : ""
  }
  ${
    persistConversation
      ? "script.setAttribute('data-persist-conversation', 'true');"
      : ""
  }
  ${
    persistConversation && conversationStorageKey
      ? `script.setAttribute('data-conversation-storage-key', '${conversationStorageKey.replace(
          /'/g,
          "\\'"
        )}');`
      : ""
  }
  script.async = true;
  document.body.appendChild(script);
  
  return () => {
    document.body.removeChild(script);
  };
}, []);`,
    },
    {
      name: "Vue.js",
      category: "Web Frameworks",
      keywords: ["vue", "vuejs", "vue.js", "nuxt"],
      description: "Add to your main component or index.html:",
      code: `// Option 1: Add to public/index.html before </body>
${scriptTag
  .split("\n")
  .map((line) => "  " + line)
  .join("\n")}

// Option 2: Load in a Vue component
import { onMounted, onUnmounted } from 'vue'

onMounted(() => {
  const script = document.createElement('script')
  script.src = 'https://www.chatiq.io/widget.js'
  script.setAttribute('data-bot-slug', '${bot.slug}')
  script.setAttribute('data-api-key', '${selectedApiKey}')
  script.setAttribute('data-position', '${position}')
  script.setAttribute('data-primary-color', '${primaryColor}')
  script.setAttribute('data-source-label', '${sourceLabel.replace(
    /'/g,
    "\\'"
  )}')
  script.setAttribute('data-embed-id', '${embedId.replace(/'/g, "\\'")}')
  ${size !== "medium" ? `script.setAttribute('data-size', '${size}')` : ""}
  ${
    headerTitle !== "Chat with us"
      ? `script.setAttribute('data-header-title', '${headerTitle.replace(
          /'/g,
          "\\'"
        )}')`
      : ""
  }
  ${
    persistConversation
      ? "script.setAttribute('data-persist-conversation', 'true')"
      : ""
  }
  ${
    persistConversation && conversationStorageKey
      ? `script.setAttribute('data-conversation-storage-key', '${conversationStorageKey.replace(
          /'/g,
          "\\'"
        )}')`
      : ""
  }
  script.async = true
  document.body.appendChild(script)
})

onUnmounted(() => {
  const script = document.querySelector('script[src="https://www.chatiq.io/widget.js"]')
  if (script) {
    document.body.removeChild(script)
  }
})`,
    },
    {
      name: "Angular",
      category: "Web Frameworks",
      keywords: ["angular", "angularjs"],
      description: "Add to index.html or use in a component:",
      code: `// Option 1: Add to src/index.html before </body>
${scriptTag
  .split("\n")
  .map((line) => "  " + line)
  .join("\n")}

// Option 2: Load in a component using AfterViewInit
import { Component, AfterViewInit, OnDestroy } from '@angular/core'

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html'
})
export class AppComponent implements AfterViewInit, OnDestroy {
  private script?: HTMLScriptElement

  ngAfterViewInit() {
    this.script = document.createElement('script')
    this.script.src = 'https://www.chatiq.io/widget.js'
    this.script.setAttribute('data-bot-slug', '${bot.slug}')
    this.script.setAttribute('data-api-key', '${selectedApiKey}')
    this.script.setAttribute('data-position', '${position}')
    this.script.setAttribute('data-primary-color', '${primaryColor}')
    this.script.setAttribute('data-source-label', '${sourceLabel.replace(
      /'/g,
      "\\'"
    )}')
    this.script.setAttribute('data-embed-id', '${embedId.replace(/'/g, "\\'")}')
    ${
      size !== "medium"
        ? `this.script.setAttribute('data-size', '${size}')`
        : ""
    }
    ${
      headerTitle !== "Chat with us"
        ? `this.script.setAttribute('data-header-title', '${headerTitle.replace(
            /'/g,
            "\\'"
          )}')`
        : ""
    }
    ${
      persistConversation
        ? "this.script.setAttribute('data-persist-conversation', 'true')"
        : ""
    }
    ${
      persistConversation && conversationStorageKey
        ? `this.script.setAttribute('data-conversation-storage-key', '${conversationStorageKey.replace(
            /'/g,
            "\\'"
          )}')`
        : ""
    }
    this.script.async = true
    document.body.appendChild(this.script)
  }

  ngOnDestroy() {
    if (this.script) {
      document.body.removeChild(this.script)
    }
  }
}`,
    },
    {
      name: "Svelte / SvelteKit",
      category: "Web Frameworks",
      keywords: ["svelte", "sveltekit", "svelte kit"],
      description: "Add to app.html or use onMount:",
      code: `// Option 1: Add to src/app.html before </body>
${scriptTag
  .split("\n")
  .map((line) => "  " + line)
  .join("\n")}

// Option 2: Load in a Svelte component
<script>
  import { onMount, onDestroy } from 'svelte'
  let script

  onMount(() => {
    script = document.createElement('script')
    script.src = 'https://www.chatiq.io/widget.js'
    script.setAttribute('data-bot-slug', '${bot.slug}')
    script.setAttribute('data-api-key', '${selectedApiKey}')
    script.setAttribute('data-position', '${position}')
    script.setAttribute('data-primary-color', '${primaryColor}')
    script.setAttribute('data-source-label', '${sourceLabel.replace(
      /'/g,
      "\\'"
    )}')
    script.setAttribute('data-embed-id', '${embedId.replace(/'/g, "\\'")}')
    ${size !== "medium" ? `script.setAttribute('data-size', '${size}')` : ""}
    ${
      headerTitle !== "Chat with us"
        ? `script.setAttribute('data-header-title', '${headerTitle.replace(
            /'/g,
            "\\'"
          )}')`
        : ""
    }
    ${
      persistConversation
        ? "script.setAttribute('data-persist-conversation', 'true')"
        : ""
    }
    ${
      persistConversation && conversationStorageKey
        ? `script.setAttribute('data-conversation-storage-key', '${conversationStorageKey.replace(
            /'/g,
            "\\'"
          )}')`
        : ""
    }
    script.async = true
    document.body.appendChild(script)
  })

  onDestroy(() => {
    if (script) {
      document.body.removeChild(script)
    }
  })
</script>`,
    },
    {
      name: "WordPress",
      category: "CMS Platforms",
      keywords: ["wordpress", "wp", "woocommerce"],
      description: "Add to your theme's footer.php or use a plugin:",
      code: `<!-- Add this to your theme's footer.php file, just before </body> -->
<!-- Or use a plugin like "Insert Headers and Footers" -->
${scriptTag
  .split("\n")
  .map((line) => "  " + line)
  .join("\n")}

<!-- For WooCommerce sites, add to the same location -->`,
    },
    {
      name: "Shopify",
      category: "CMS Platforms",
      keywords: ["shopify", "ecommerce"],
      description: "Add to your theme.liquid file:",
      code: `<!-- In your Shopify admin: Online Store > Themes > Actions > Edit code -->
<!-- Then edit theme.liquid and add this before </body> -->
${scriptTag
  .split("\n")
  .map((line) => "  " + line)
  .join("\n")}

<!-- Or use a custom app/widget to inject the script -->`,
    },
    {
      name: "Wix",
      category: "CMS Platforms",
      keywords: ["wix"],
      description: "Add via HTML Embed widget:",
      code: `1. In your Wix editor, click "Add" > "Embed" > "HTML Code"
2. Paste this code:
${scriptTag
  .split("\n")
  .map((line) => "  " + line)
  .join("\n")}
3. Position the widget where you want it to appear
4. Publish your site`,
    },
    {
      name: "Squarespace",
      category: "CMS Platforms",
      keywords: ["squarespace"],
      description: "Add via Code Injection:",
      code: `1. In Squarespace: Settings > Advanced > Code Injection
2. Add to Footer section:
${scriptTag
  .split("\n")
  .map((line) => "  " + line)
  .join("\n")}
3. Save and refresh your site`,
    },
    {
      name: "Webflow",
      category: "CMS Platforms",
      keywords: ["webflow"],
      description: "Add via Custom Code embed:",
      code: `1. In Webflow: Add Elements > Embed > Custom Code
2. Paste this code:
${scriptTag
  .split("\n")
  .map((line) => "  " + line)
  .join("\n")}
3. Position it in your layout (usually in the footer)
4. Publish your site`,
    },
    {
      name: "Plain HTML / Static Sites",
      category: "Static Sites",
      keywords: ["html", "static", "plain html"],
      description: "Paste the script tag just before the closing </body> tag:",
      code: `<body>
  <!-- Your content -->
  
  ${scriptTag
    .split("\n")
    .map((line) => "  " + line)
    .join("\n")}
</body>`,
    },
    {
      name: "React Native",
      category: "Mobile Apps",
      keywords: ["react native", "react-native", "mobile", "ios", "android"],
      description: "Use WebView to embed the widget:",
      code: `import { WebView } from 'react-native-webview'

export default function App() {
  const htmlContent = \`
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body>
        ${scriptTag
          .split("\n")
          .map((line) => "        " + line)
          .join("\n")}
      </body>
    </html>
  \`

  return (
    <WebView
      source={{ html: htmlContent }}
      style={{ flex: 1 }}
    />
  )
}`,
    },
    {
      name: "Flutter",
      category: "Mobile Apps",
      keywords: ["flutter", "dart", "mobile"],
      description: "Use WebView to embed the widget:",
      code: `import 'package:flutter/material.dart'
import 'package:webview_flutter/webview_flutter.dart'

class ChatWidget extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final htmlContent = '''
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body>
          ${scriptTag
            .split("\n")
            .map((line) => "          " + line)
            .join("\n")}
        </body>
      </html>
    '''

    return WebView(
      initialData: WebViewInitialData(
        baseUrl: 'https://www.chatiq.io',
        data: htmlContent,
        mimeType: 'text/html',
        encoding: 'utf8',
      ),
    )
  }
}`,
    },
  ];

  // Filter frameworks based on search
  const filteredFrameworks = frameworks.filter((framework) => {
    if (!frameworkSearch.trim()) return true;
    const searchLower = frameworkSearch.toLowerCase();
    return (
      framework.name.toLowerCase().includes(searchLower) ||
      framework.category.toLowerCase().includes(searchLower) ||
      framework.keywords.some((keyword) =>
        keyword.toLowerCase().includes(searchLower)
      )
    );
  });

  // Group by category
  const frameworksByCategory = filteredFrameworks.reduce((acc, framework) => {
    if (!acc[framework.category]) {
      acc[framework.category] = [];
    }
    acc[framework.category].push(framework);
    return acc;
  }, {} as Record<string, typeof frameworks>);

  // Load widget preview when script tag is available
  useEffect(() => {
    if (!scriptTag || !selectedApiKey || !previewContainerRef.current) {
      return;
    }

    // Clear previous preview
    const container = previewContainerRef.current;
    container.innerHTML = "";

    // Create an iframe to isolate the widget
    const iframe = document.createElement("iframe");
    iframe.style.width = "100%";
    iframe.style.height = "600px";
    iframe.style.border = "1px solid #e5e7eb";
    iframe.style.borderRadius = "8px";
    iframe.style.background = "#fff";

    // Create HTML content
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Widget Preview</title>
  <style>
    body {
      margin: 0;
      padding: 20px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f9fafb;
    }
    .preview-header {
      text-align: center;
      color: #6b7280;
      font-size: 14px;
      margin-bottom: 20px;
    }
  </style>
</head>
<body>
  <div class="preview-header">Widget Preview - This is how it will appear on your website. Scroll down to see the widget button ☟.</div>
</body>
</html>
    `;

    // Set iframe content
    iframe.srcdoc = htmlContent;
    container.appendChild(iframe);

    // Wait for iframe to load, then inject the script
    iframe.onload = () => {
      try {
        const iframeDoc =
          iframe.contentDocument || iframe.contentWindow?.document;
        if (!iframeDoc) return;

        // Parse the script tag to extract attributes
        const scriptMatch = scriptTag.match(/<script[^>]*>/);
        if (!scriptMatch) return;

        const scriptTagHtml = scriptMatch[0];
        const script = iframeDoc.createElement("script");

        // Extract src
        const srcMatch = scriptTagHtml.match(/src="([^"]+)"/);
        if (srcMatch) {
          script.src = srcMatch[1];
        }

        // Extract all data attributes
        const dataAttrRegex = /data-(\w+(?:-\w+)*)="([^"]+)"/g;
        let match;
        while ((match = dataAttrRegex.exec(scriptTagHtml)) !== null) {
          script.setAttribute(`data-${match[1]}`, match[2]);
        }

        // Set async attribute
        if (scriptTagHtml.includes("async")) {
          script.async = true;
        }

        // Append to body
        iframeDoc.body.appendChild(script);
      } catch (error) {
        console.error("Error loading widget preview:", error);
        // Fallback: show error message
        if (container) {
          container.innerHTML = `
            <div class="border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg p-8 text-center text-zinc-500">
              Preview unavailable. The widget will work correctly when embedded on your website.
              <br />
              <span class="text-xs mt-2 block">
                This is a limitation of iframe sandboxing. Copy the script tag above to see it in action.
              </span>
            </div>
          `;
        }
      }
    };

    // Cleanup function
    return () => {
      if (container.contains(iframe)) {
        container.removeChild(iframe);
      }
    };
  }, [
    scriptTag,
    selectedApiKey,
    position,
    primaryColor,
    size,
    headerTitle,
    sourceLabel,
    embedId,
  ]);

  const handleCopy = () => {
    const script = generateScriptTag();
    if (!script) {
      toast.error("Please select an API key first");
      return;
    }
    navigator.clipboard.writeText(script);
    setCopied(true);
    toast.success("Script tag copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreateKey = () => {
    setCreateKeyDialogOpen(true);
  };

  const handleCreateKeySubmit = () => {
    if (!bot.id) {
      toast.error("Bot ID is required");
      return;
    }

    startTransition(async () => {
      const createToast = toast.loading("Creating API key...", {
        description: "Please wait while we generate your secure API key.",
      });

      // Parse allowed domains
      const domains = allowedDomains
        .split(",")
        .map((d) => d.trim())
        .filter((d) => d.length > 0);

      const result = await createApiKey({
        botId: bot.id,
        label: newKeyLabel.trim() || `Widget Key - ${bot.name}`,
        allowedDomains: domains.length > 0 ? domains : undefined,
        isWidgetOnly: true,
      });

      if (result.success && result.apiKey) {
        toast.success("API key created successfully", {
          id: createToast,
          description:
            "Your API key has been generated and is now selected for embedding.",
        });

        // Store the plain key (only available right after creation)
        setSelectedApiKey(result.apiKey);

        // Reload API keys to get the new one
        const updatedKeys = await getUserApiKeys();
        setApiKeys(updatedKeys);

        // Find and select the newly created key
        const newKeyRecord = updatedKeys.find(
          (k) => k.bot_id === bot.id && k.id === result.id
        );

        if (newKeyRecord) {
          setSelectedApiKeyId(newKeyRecord.id);
        }

        setCreateKeyDialogOpen(false);
        setNewKeyLabel("");
      } else {
        toast.error("Failed to create API key", {
          id: createToast,
          description: result.error || "An unknown error occurred",
        });
      }
    });
  };

  return (
    <div className="w-full space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Embed Widget</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Generate a one-line script tag to embed your bot on any website
        </p>
      </div>

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Security Notice:</strong> API keys embedded in script tags are
          visible in your website's HTML source code. This is standard for
          client-side widgets. We recommend:
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Creating dedicated "widget-only" API keys for embedding</li>
            <li>
              Using domain whitelisting to restrict where keys can be used
            </li>
            <li>Revoking keys immediately if they're compromised</li>
          </ul>
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuration Panel */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Configuration</CardTitle>
              <CardDescription>
                Customize your widget's appearance and behavior
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* API Key Selection */}
              <div className="space-y-2">
                <Label htmlFor="api-key">API Key *</Label>
                <div className="flex gap-2">
                  <Select
                    value={selectedApiKeyId}
                    onValueChange={(value) => {
                      setSelectedApiKeyId(value);
                      // Note: We can't retrieve the plain key for existing keys
                      // User can manually paste the key in the input field below
                      if (value && !selectedApiKey) {
                        // Clear any existing key value when selecting a different key
                        setSelectedApiKey("");
                      }
                    }}
                  >
                    <SelectTrigger id="api-key">
                      <SelectValue placeholder="Select or create an API key" />
                    </SelectTrigger>
                    <SelectContent>
                      {botApiKeys.length === 0 ? (
                        <SelectItem value="none" disabled>
                          No API keys available
                        </SelectItem>
                      ) : (
                        botApiKeys.map((key) => (
                          <SelectItem key={key.id} value={key.id}>
                            {key.label || `Key ${key.key.slice(-4)}`}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCreateKey}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    New
                  </Button>
                </div>
                <p className="text-xs text-zinc-500">
                  Select an existing key or create a new one. If selecting an
                  existing key, paste it in the field below.
                </p>
              </div>

              {/* Manual API Key Input */}
              <div className="space-y-2">
                <Label htmlFor="manual-api-key">API Key Value *</Label>
                <div className="flex gap-2">
                  <Input
                    id="manual-api-key"
                    value={selectedApiKey}
                    onChange={(e) => setSelectedApiKey(e.target.value)}
                    placeholder="Paste your API key here (sk_live_...)"
                    className="font-mono text-sm"
                  />
                  {selectedApiKey && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        navigator.clipboard.writeText(selectedApiKey);
                        toast.success("API key copied!");
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <p className="text-xs text-zinc-500">
                  {selectedApiKeyId && !selectedApiKey
                    ? "Selected an existing key? Paste it here if you have it saved. Otherwise, create a new key."
                    : "Enter or paste your API key. If you just created one, it's shown above. Save it securely - you won't be able to see it again."}
                </p>
              </div>

              {/* Position */}
              <div className="space-y-2">
                <Label htmlFor="position">Position</Label>
                <Select
                  value={position}
                  onValueChange={(v) => setPosition(v as Position)}
                >
                  <SelectTrigger id="position">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bottom-right">Bottom Right</SelectItem>
                    <SelectItem value="bottom-left">Bottom Left</SelectItem>
                    <SelectItem value="inline">Inline</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Primary Color */}
              <div className="space-y-2">
                <Label htmlFor="color">Primary Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="color"
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-20 h-10"
                  />
                  <Input
                    type="text"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    placeholder="#10b981"
                    className="flex-1"
                  />
                </div>
              </div>

              {/* Size */}
              <div className="space-y-2">
                <Label htmlFor="size">Size</Label>
                <Select value={size} onValueChange={(v) => setSize(v as Size)}>
                  <SelectTrigger id="size">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">Small</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="large">Large</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Header Title */}
              <div className="space-y-2">
                <Label htmlFor="header-title">Header Title</Label>
                <Input
                  id="header-title"
                  value={headerTitle}
                  onChange={(e) => setHeaderTitle(e.target.value)}
                  placeholder="Chat with us"
                />
                <p className="text-xs text-zinc-500">
                  Customize the title shown in the widget header
                </p>
              </div>

              {/* Source Label */}
              <div className="space-y-2">
                <Label htmlFor="source-label">Source Detail Label</Label>
                <Input
                  id="source-label"
                  value={sourceLabel}
                  onChange={(e) => setSourceLabel(e.target.value)}
                  placeholder="web"
                />
                <p className="text-xs text-zinc-500">
                  Visible in the conversations table (e.g., owolf.com).
                </p>
              </div>

              {/* Embed ID */}
              <div className="space-y-2">
                <Label htmlFor="embed-id">Embed ID</Label>
                <Input
                  id="embed-id"
                  value={embedId}
                  onChange={(e) => setEmbedId(e.target.value)}
                  placeholder={bot.slug}
                />
                <p className="text-xs text-zinc-500">
                  Optional identifier for this embed instance.
                </p>
              </div>

              {/* Conversation Persistence */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="persist-conversation">
                    Persist Conversation (Anonymous)
                  </Label>
                  <Switch
                    id="persist-conversation"
                    checked={persistConversation}
                    onCheckedChange={setPersistConversation}
                  />
                </div>
                <p className="text-xs text-zinc-500">
                  Stores the conversation ID in the visitor's local storage so
                  chats can resume on reload.
                </p>
                {persistConversation && (
                  <Input
                    id="conversation-storage-key"
                    value={conversationStorageKey}
                    onChange={(e) => setConversationStorageKey(e.target.value)}
                    placeholder={`chatiq_conversation_${bot.slug}_${embedId || bot.slug}`}
                  />
                )}
              </div>

              {/* Domain Whitelisting (Optional) */}
              <div className="space-y-2">
                <Label htmlFor="domains">Allowed Domains (Optional)</Label>
                <Textarea
                  id="domains"
                  value={allowedDomains}
                  onChange={(e) => setAllowedDomains(e.target.value)}
                  placeholder="example.com, www.example.com"
                  rows={2}
                />
                <p className="text-xs text-zinc-500">
                  Comma-separated list of domains where this widget can be used.
                  Leave empty to allow any domain. Note: Domain validation
                  requires creating a new API key with domain restrictions.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Preview & Script Tag */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Script Tag</CardTitle>
              <CardDescription>
                Copy this script tag and paste it into your website's HTML
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Embed Code</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCopy}
                    disabled={!scriptTag}
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
                <Textarea
                  value={scriptTag || "Please select an API key first"}
                  readOnly
                  className="font-mono text-sm min-h-[120px]"
                />
              </div>

              {!selectedApiKey && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Please enter an API key above to generate the embed code.
                    You can create a new key or paste an existing one if you
                    have it saved.
                  </AlertDescription>
                </Alert>
              )}

              {/* Framework-specific instructions */}
              {scriptTag && (
                <div className="space-y-4 pt-2 border-t">
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full justify-between"
                    onClick={() => setInstructionsOpen(!instructionsOpen)}
                  >
                    <span>Framework-specific Instructions</span>
                    {instructionsOpen ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                  {instructionsOpen && (
                    <div className="space-y-4">
                      {/* Search Input */}
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-400" />
                        <Input
                          type="text"
                          placeholder="Search frameworks and platforms (e.g., WordPress, Vue, React Native)..."
                          value={frameworkSearch}
                          onChange={(e) => setFrameworkSearch(e.target.value)}
                          className="pl-10"
                        />
                      </div>

                      {/* Framework List */}
                      {Object.keys(frameworksByCategory).length === 0 ? (
                        <div className="text-center py-8 text-zinc-500 text-sm">
                          No frameworks found matching "{frameworkSearch}"
                        </div>
                      ) : (
                        <div className="space-y-6">
                          {Object.entries(frameworksByCategory).map(
                            ([category, categoryFrameworks]) => (
                              <div key={category} className="space-y-3">
                                <h4 className="font-semibold text-sm text-zinc-700 dark:text-zinc-300 border-b pb-2">
                                  {category}
                                </h4>
                                <div className="space-y-4">
                                  {categoryFrameworks.map((framework) => (
                                    <div
                                      key={framework.name}
                                      className="space-y-2"
                                    >
                                      <h5 className="font-semibold text-sm">
                                        {framework.name}
                                      </h5>
                                      <p className="text-zinc-600 dark:text-zinc-400 text-xs">
                                        {framework.description}
                                      </p>
                                      <div className="bg-zinc-50 dark:bg-zinc-900 p-3 rounded border border-zinc-200 dark:border-zinc-800">
                                        <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
                                          {framework.code}
                                        </pre>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Preview</CardTitle>
              <CardDescription>
                See how your widget will look (preview only)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!scriptTag || !selectedApiKey ? (
                <div className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg p-8 text-center text-zinc-500">
                  Widget preview will appear here when script tag is generated.
                  <br />
                  <span className="text-xs mt-2 block">
                    Please enter an API key above to see the preview.
                  </span>
                </div>
              ) : (
                <div
                  ref={previewContainerRef}
                  className="border-2 border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden bg-zinc-50 dark:bg-zinc-900"
                  style={{ minHeight: "600px" }}
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Documentation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Need help? Check out our integration guides:
              </p>
              <Button variant="outline" asChild className="w-full">
                <a
                  href="https://www.chatiq.io/docs/integrations/website"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Integration Docs
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Create API Key Dialog */}
      {createKeyDialogOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Create Widget API Key</CardTitle>
              <CardDescription>
                Create a new API key specifically for widget embedding
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  This key will be marked as "widget-only" and can be restricted
                  to specific domains.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="key-label">Label (Optional)</Label>
                <Input
                  id="key-label"
                  value={newKeyLabel}
                  onChange={(e) => setNewKeyLabel(e.target.value)}
                  placeholder={`Widget Key - ${bot.name}`}
                  disabled={isPending}
                />
                <p className="text-xs text-zinc-500">
                  Add a label to help identify this key later
                </p>
              </div>

              {allowedDomains && (
                <div className="space-y-2">
                  <Label>Domain Restrictions</Label>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    This key will be restricted to:{" "}
                    {allowedDomains
                      .split(",")
                      .map((d) => d.trim())
                      .filter(Boolean)
                      .join(", ") || "No restrictions"}
                  </p>
                </div>
              )}
            </CardContent>
            <div className="px-6 pb-6 flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setCreateKeyDialogOpen(false);
                  setNewKeyLabel("");
                }}
                disabled={isPending}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateKeySubmit}
                disabled={isPending}
                className="flex-1"
              >
                {isPending ? "Creating..." : "Create Key"}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
