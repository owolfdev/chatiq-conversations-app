//src/app/profile/profile-tabs.tsx
"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { MessageSquare, Star, Bot, Users } from "lucide-react";
import Image from "next/image";

const chatbots = [
  {
    id: 1,
    name: "Customer Support Bot",
    description: "Handles customer inquiries and support tickets automatically",
    category: "Support",
    messages: 12450,
    rating: 4.8,
    lastUpdated: "2 days ago",
    image: "/placeholder.svg?height=150&width=300",
    public: true,
  },
  {
    id: 2,
    name: "FAQ Assistant",
    description:
      "Answers frequently asked questions about products and services",
    category: "Information",
    messages: 8920,
    rating: 4.6,
    lastUpdated: "1 week ago",
    image: "/placeholder.svg?height=150&width=300",
    public: true,
  },
  {
    id: 3,
    name: "Product Guide",
    description: "Helps users navigate product features and capabilities",
    category: "Guide",
    messages: 5670,
    rating: 4.7,
    lastUpdated: "2 weeks ago",
    image: "/placeholder.svg?height=150&width=300",
    public: true,
  },
];

const achievements = [
  {
    title: "ChatIQ Pioneer",
    description: "Created 10+ chatbots",
    icon: <Bot className="h-5 w-5 text-emerald-500" />,
    date: "March 2024",
  },
  {
    title: "Conversation Master",
    description: "Reached 20,000 messages",
    icon: <MessageSquare className="h-5 w-5 text-blue-500" />,
    date: "February 2024",
  },
  {
    title: "Community Contributor",
    description: "Shared 5 public templates",
    icon: <Users className="h-5 w-5 text-purple-500" />,
    date: "January 2024",
  },
];

const testimonials = [
  {
    text: "Alex's Customer Support Bot has transformed how we handle customer inquiries. Response time reduced by 80%!",
    author: "Sarah Chen",
    company: "TechCorp",
    avatar: "/placeholder.svg?height=50&width=50",
  },
  {
    text: "The Product Guide chatbot Alex built for us has significantly improved our user onboarding experience.",
    author: "Michael Rodriguez",
    company: "StartupX",
    avatar: "/placeholder.svg?height=50&width=50",
  },
];

export default function ProfileTabs() {
  return (
    <Tabs defaultValue="chatbots" className="mt-8">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="chatbots">Chatbots</TabsTrigger>
        <TabsTrigger value="achievements">Achievements</TabsTrigger>
        <TabsTrigger value="testimonials">Testimonials</TabsTrigger>
      </TabsList>

      <TabsContent value="chatbots" className="mt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {chatbots.map((chatbot) => (
            <Card
              key={chatbot.id}
              className="overflow-hidden hover:shadow-lg transition-shadow"
            >
              <div className="h-40 overflow-hidden">
                <Image
                  src={chatbot.image}
                  alt={chatbot.name}
                  className="w-full h-full object-cover"
                  width={300}
                  height={150}
                />
              </div>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <Badge>{chatbot.category}</Badge>
                  <div className="flex items-center">
                    <Star className="h-4 w-4 text-yellow-500 mr-1" />
                    <span className="text-sm">{chatbot.rating}</span>
                  </div>
                </div>
                <h3 className="font-semibold text-lg mb-2">{chatbot.name}</h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
                  {chatbot.description}
                </p>
                <div className="flex items-center justify-between text-sm text-zinc-600 dark:text-zinc-400">
                  <div className="flex items-center">
                    <MessageSquare className="h-4 w-4 mr-1" />
                    <span>{chatbot.messages.toLocaleString()}</span>
                  </div>
                  <span>Updated {chatbot.lastUpdated}</span>
                </div>
                <Button className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600">
                  Try ChatIQ
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </TabsContent>

      <TabsContent value="achievements" className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Achievements</CardTitle>
            <CardDescription>Milestones and recognition</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {achievements.map((achievement, index) => (
                <div
                  key={index}
                  className="flex items-center gap-4 p-4 border border-zinc-200 rounded-lg dark:border-zinc-700"
                >
                  <div className="p-3 bg-zinc-100 rounded-full dark:bg-zinc-800">
                    {achievement.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">{achievement.title}</h3>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      {achievement.description}
                    </p>
                  </div>
                  <Badge variant="outline">{achievement.date}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="testimonials" className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Testimonials</CardTitle>
            <CardDescription>
              What others say about Alex&apos;s work
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {testimonials.map((testimonial, index) => (
                <div
                  key={index}
                  className="p-6 border border-zinc-200 rounded-lg dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
                >
                  <p className="italic mb-4 text-zinc-700 dark:text-zinc-300">
                    &quot;{testimonial.text}&quot;
                  </p>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage
                        src={testimonial.avatar}
                        alt={testimonial.author}
                      />
                      <AvatarFallback>
                        {testimonial.author
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{testimonial.author}</p>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        {testimonial.company}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
