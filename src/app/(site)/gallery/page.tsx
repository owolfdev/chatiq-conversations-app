"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Bot, Eye, Heart, Search, Star, Users } from "lucide-react";
import Image from "next/image";
import { Template } from "@/types/template";

export default function GalleryPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const templates = [
    {
      id: "1",
      name: "Customer Support Assistant",
      description:
        "Handle customer inquiries, FAQs, and support tickets automatically",
      category: "Customer Service",
      tags: ["Support", "FAQ", "Tickets"],
      rating: 4.8,
      uses: 1250,
      likes: 89,
      preview: "/placeholder.svg?height=200&width=300",
      featured: true,
    },
    {
      id: "2",
      name: "E-commerce Shopping Helper",
      description:
        "Guide customers through product selection and purchasing decisions",
      category: "E-commerce",
      tags: ["Shopping", "Products", "Sales"],
      rating: 4.6,
      uses: 890,
      likes: 67,
      preview: "/placeholder.svg?height=200&width=300",
      featured: false,
    },
    {
      id: "3",
      name: "HR Onboarding Bot",
      description:
        "Streamline employee onboarding with automated guidance and forms",
      category: "Human Resources",
      tags: ["HR", "Onboarding", "Forms"],
      rating: 4.7,
      uses: 456,
      likes: 34,
      preview: "/placeholder.svg?height=200&width=300",
      featured: true,
    },
    {
      id: "4",
      name: "Educational Tutor",
      description:
        "Provide personalized learning assistance and answer student questions",
      category: "Education",
      tags: ["Learning", "Tutor", "Students"],
      rating: 4.9,
      uses: 2100,
      likes: 156,
      preview: "/placeholder.svg?height=200&width=300",
      featured: false,
    },
    {
      id: "5",
      name: "Healthcare Symptom Checker",
      description:
        "Help users understand symptoms and guide them to appropriate care",
      category: "Healthcare",
      tags: ["Health", "Symptoms", "Medical"],
      rating: 4.5,
      uses: 678,
      likes: 45,
      preview: "/placeholder.svg?height=200&width=300",
      featured: false,
    },
    {
      id: "6",
      name: "Real Estate Assistant",
      description:
        "Help clients find properties and answer real estate questions",
      category: "Real Estate",
      tags: ["Property", "Listings", "Clients"],
      rating: 4.4,
      uses: 234,
      likes: 23,
      preview: "/placeholder.svg?height=200&width=300",
      featured: false,
    },
  ];

  const categories = [
    "All",
    "Customer Service",
    "E-commerce",
    "Human Resources",
    "Education",
    "Healthcare",
    "Real Estate",
  ];

  const filteredTemplates = templates.filter((template) => {
    const matchesSearch =
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.tags.some((tag) =>
        tag.toLowerCase().includes(searchQuery.toLowerCase())
      );

    const matchesCategory =
      selectedCategory === "all" ||
      template.category.toLowerCase() === selectedCategory.toLowerCase();

    return matchesSearch && matchesCategory;
  });

  const featuredTemplates = templates.filter((template) => template.featured);

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900 flex flex-col dark:bg-zinc-900 dark:text-zinc-100">
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Header */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold">ChatIQ Gallery</h1>
            <p className="text-xl text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
              Discover pre-built chatbot templates and get inspired by what
              others have created
            </p>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <Input
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              value={selectedCategory}
              onValueChange={setSelectedCategory}
            >
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category} value={category.toLowerCase()}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Featured Templates */}
          {selectedCategory === "all" && searchQuery === "" && (
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500" />
                <h2 className="text-2xl font-bold">Featured Templates</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {featuredTemplates.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    featured
                  />
                ))}
              </div>
            </div>
          )}

          {/* All Templates */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">
                {selectedCategory === "all"
                  ? "All Templates"
                  : `${selectedCategory} Templates`}
              </h2>
              <p className="text-zinc-600 dark:text-zinc-400">
                {filteredTemplates.length} template
                {filteredTemplates.length !== 1 ? "s" : ""} found
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTemplates.map((template) => (
                <TemplateCard key={template.id} template={template} />
              ))}
            </div>
          </div>

          {filteredTemplates.length === 0 && (
            <div className="text-center py-12">
              <Bot className="h-16 w-16 mx-auto text-zinc-400 mb-4" />
              <h3 className="text-xl font-semibold mb-2">No templates found</h3>
              <p className="text-zinc-600 dark:text-zinc-400">
                Try adjusting your search or filter criteria
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function TemplateCard({
  template,
  featured = false,
}: {
  template: Template;
  featured?: boolean;
}) {
  return (
    <Card
      className={`group hover:shadow-lg transition-all ${
        featured ? "ring-2 ring-emerald-500" : ""
      }`}
    >
      <CardHeader className="p-0">
        <div className="relative">
          <Image
            src={template.preview || "/placeholder.svg"}
            alt={template.name}
            className="w-full h-48 object-cover rounded-t-lg"
            width={300}
            height={200}
          />
          {featured && (
            <Badge className="absolute top-3 left-3 bg-emerald-600">
              <Star className="h-3 w-3 mr-1" />
              Featured
            </Badge>
          )}
          <div className="absolute top-3 right-3 flex gap-2">
            <Button
              size="icon"
              variant="secondary"
              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="secondary"
              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Heart className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-3">
          <div>
            <CardTitle className="text-lg mb-1">{template.name}</CardTitle>
            <CardDescription className="text-sm">
              {template.description}
            </CardDescription>
          </div>

          <div className="flex flex-wrap gap-1">
            {template.tags.map((tag: string) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>

          <div className="flex items-center justify-between text-sm text-zinc-600 dark:text-zinc-400">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 text-yellow-500" />
                <span>{template.rating}</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                <span>{template.uses}</span>
              </div>
              <div className="flex items-center gap-1">
                <Heart className="h-4 w-4" />
                <span>{template.likes}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              size="sm"
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600"
            >
              Use Template
            </Button>
            <Button size="sm" variant="outline">
              <Eye className="h-4 w-4 mr-1" />
              Preview
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
