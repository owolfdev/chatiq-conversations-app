// src/app/(site)/product/th/page.tsx

import Link from "next/link";
import type { Metadata } from "next";

import { Button } from "@/components/ui/button";
import {
  ArrowUpRight,
  CheckCircle2,
  Globe2,
  MessageCircle,
  Rocket,
} from "lucide-react";

const siteUrl = "https://www.chatiq.io";

export const metadata: Metadata = {
  title: "ผลิตภัณฑ์",
  description:
    "ดูว่า ChatIQ เปลี่ยนเอกสารและ FAQ ของคุณให้เป็นแชตบอทที่พร้อมช่วยปิดการขายได้อย่างไร",
  alternates: {
    canonical: "/product/th",
  },
  openGraph: {
    title: "ผลิตภัณฑ์ ChatIQ",
    description:
      "ดูว่า ChatIQ เปลี่ยนเอกสารและ FAQ ของคุณให้เป็นแชตบอทที่พร้อมช่วยปิดการขายได้อย่างไร",
    url: "/product/th",
    siteName: "ChatIQ",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ผลิตภัณฑ์ ChatIQ",
    description:
      "ดูว่า ChatIQ เปลี่ยนเอกสารและ FAQ ของคุณให้เป็นแชตบอทที่พร้อมช่วยปิดการขายได้อย่างไร",
  },
};

export default function ProductPageThai() {
  const faqItems = [
    {
      question: "เปิดใช้งานบอท ChatIQ ได้เร็วแค่ไหน?",
      answer:
        "ทีมส่วนใหญ่เริ่มได้ในไม่กี่นาที เพียงเชื่อมต่อเอกสารและฝังโค้ด",
    },
    {
      question: "สามารถให้ความรู้ ChatIQ ด้วยเนื้อหาแบบไหนได้บ้าง?",
      answer:
        "ให้ความรู้ได้จากเอกสาร FAQ หน้าสินค้า และคอนเทนต์การตลาดอื่นๆ",
    },
    {
      question: "เพิ่ม ChatIQ ลงในเว็บไซต์ได้อย่างไร?",
      answer:
        "วางโค้ดฝังเพียงบรรทัดเดียวบนทุกหน้า หรือแชร์ลิงก์แชตที่โฮสต์ไว้",
    },
  ];
  const softwareApplicationStructuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "ChatIQ",
    operatingSystem: "Web",
    applicationCategory: "BusinessApplication",
    description:
      "ChatIQ เปลี่ยนเอกสารและ FAQ ให้เป็นแชตบอทที่พร้อมช่วยปิดการขายและฝังได้ทุกที่",
    url: `${siteUrl}/product/th`,
    image: `${siteUrl}/icon-512.png`,
    provider: {
      "@type": "Organization",
      name: "ChatIQ",
      url: siteUrl,
    },
  };
  const faqStructuredData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  return (
    <main className="flex min-h-screen flex-col bg-background text-foreground">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(softwareApplicationStructuredData),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqStructuredData),
        }}
      />
      <section className="container mx-auto flex max-w-6xl flex-col items-center gap-8 px-6 pb-20 pt-24 text-center">
        <div className="flex items-center gap-2 rounded-full border border-border/60 bg-muted px-4 py-2 text-sm font-semibold text-emerald-500">
          <Globe2 className="h-4 w-4" />
          ใช้งานจริงที่
          <Link
            href={siteUrl}
            className="inline-flex items-center gap-1 font-bold underline decoration-emerald-400 decoration-2 underline-offset-4"
          >
            {siteUrl.replace("https://", "")}
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="space-y-4">
          <p className="text-sm uppercase tracking-[0.25em] text-emerald-500">
            แชตบอท AI สำหรับธุรกิจจริง
          </p>
          <h1 className="text-4xl font-black leading-tight sm:text-6xl md:text-7xl">
            ฝังแชตบอทที่ขับเคลื่อนด้วย GPT ที่คุณให้ความรู้ด้วยคอนเทนต์ของคุณได้ในไม่กี่นาทีที่{" "}
            <span className="text-emerald-500">ChatIQ.io</span>.
          </h1>
          <p className="text-lg text-muted-foreground sm:text-xl">
            ChatIQ นำเข้าเอกสาร FAQ และหน้าสินค้าของคุณ แล้วสร้างประสบการณ์แชตที่สวยงาม
            ซึ่งนำไปใช้ได้ทุกที่: เว็บไซต์การตลาด ทัวร์สินค้า และโฟลว์ออนบอร์ด
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-4">
          <Button asChild size="lg" className="text-base">
            <Link href="/sign-up">เริ่ม Evaluation</Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="text-base border-emerald-500 text-emerald-500 hover:bg-emerald-950"
          >
            <Link href="#why">ดูเหตุผลที่ทีมเลือก ChatIQ</Link>
          </Button>
        </div>
      </section>

      <section
        id="why"
        className="container mx-auto grid max-w-5xl gap-8 px-6 pb-20 md:grid-cols-2"
      >
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-500">
            <Rocket className="h-4 w-4" />
            สร้างมาเพื่อปล่อยงานให้เร็ว
          </div>
          <h2 className="text-3xl font-bold md:text-4xl">
            เปลี่ยนทราฟฟิกให้เป็นบทสนทนาที่ปิดการขาย
          </h2>
          <p className="text-muted-foreground">
            ChatIQ จับผู้เยี่ยมชมที่มีความตั้งใจสูงด้วยคำตอบที่รวดเร็วและตรงแบรนด์
            อัปโหลดคอนเทนต์การตลาด เอกสารออนบอร์ด และสรุปการขาย แล้วฝังโค้ดเพียงบรรทัดเดียว
            เพื่อให้ได้แชตบอทที่พร้อมช่วยปิดการขายในทุกหน้า
          </p>
          <div className="flex flex-col gap-3">
            {[
              "ให้ความรู้ด้วยเอกสาร FAQ และหน้าสินค้าได้โดยไม่ต้องเขียนโค้ด",
              "กำหนดโทนเสียง กรอบการตอบ และพรอมต์แนะนำให้คงความเป็นแบรนด์",
              "ฝังได้ทุกที่ด้วยโค้ดบรรทัดเดียว หรือส่งคนไปยังลิงก์แชตที่โฮสต์ไว้",
              "แอนะลิติกส์ที่บอกคำถามที่คนถามก่อนตัดสินใจซื้อ",
            ].map((item) => (
              <p key={item} className="flex items-start gap-3 text-left">
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-500" />
                <span>{item}</span>
              </p>
            ))}
          </div>
          <div className="flex gap-4">
            <Button asChild className="bg-emerald-500 hover:bg-emerald-600">
              <Link href="/sign-up">เปิดตัวบอท</Link>
            </Button>
            <Button asChild variant="ghost" className="gap-2">
              <Link href="/contact">
                คุยกับฝ่ายขาย
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-2xl border border-border bg-muted/60 p-8">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent" />
          <div className="relative space-y-4">
            <div className="flex items-center justify-between rounded-xl bg-background/80 p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-emerald-500/10 p-3">
                  <MessageCircle className="h-6 w-6 text-emerald-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-muted-foreground">
                    บอทบริการลูกค้า
                  </p>
                  <p className="text-lg font-bold">Acme Help Desk</p>
                </div>
              </div>
              <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-500">
                ใช้งานอยู่
              </span>
            </div>
            <div className="rounded-xl bg-background/90 p-6 shadow-sm">
              <p className="text-sm font-semibold text-emerald-500">พรอมต์</p>
              <p className="font-medium">
                คุณคือผู้ช่วยบริการลูกค้าของ Acme ตอบด้วยน้ำเสียงเป็นมิตร กระชับ
                และใส่ลิงก์บทความช่วยเหลือเมื่อเป็นไปได้
              </p>
              <div className="mt-6 grid gap-3">
                {[
                  {
                    question: "เช็คสถานะออเดอร์ได้ที่ไหน?",
                    answer:
                      "แจ้งเลขออเดอร์และอีเมลที่ใช้สั่งซื้อ แล้วฉันจะตรวจสอบให้ทันที หรือเช็คเองได้ที่ acme.com/help/track-order",
                  },
                  {
                    question: "สามารถคืนสินค้าหลัง 30 วันได้ไหม?",
                    answer:
                      "เรารับคืนภายใน 45 วันสำหรับสินค้าที่ไม่ได้ใช้งาน เริ่มการคืนได้ที่ acme.com/help/returns แล้วฉันจะช่วยไกด์ขั้นตอนให้",
                  },
                  {
                    question: "มีจัดส่งต่างประเทศไหม?",
                    answer:
                      "มีค่ะ เราจัดส่งมากกว่า 40 ประเทศ ดูเวลาและค่าจัดส่งได้ที่ acme.com/help/shipping",
                  },
                ].map((item) => (
                  <div
                    key={item.question}
                    className="rounded-lg border border-border/70 bg-muted/60 p-3 text-left"
                  >
                    <p className="text-sm font-semibold text-muted-foreground">
                      ผู้เยี่ยมชมถาม
                    </p>
                    <p className="text-base font-medium">{item.question}</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      ChatIQ ตอบ
                    </p>
                    <p className="text-sm">{item.answer}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-border">
        <div className="container mx-auto flex max-w-4xl flex-col gap-8 px-6 py-16">
          <div className="text-center space-y-3">
            <p className="text-sm uppercase tracking-[0.25em] text-emerald-500">
              คำถามที่พบบ่อย
            </p>
            <h2 className="text-3xl font-bold">FAQ</h2>
            <p className="text-muted-foreground">
              คำตอบสั้นๆ สำหรับคำถามที่เราได้รับบ่อยที่สุด
            </p>
          </div>
          <div className="grid gap-6">
            {faqItems.map((item) => (
              <div
                key={item.question}
                className="rounded-2xl border border-border bg-muted/40 p-6"
              >
                <h3 className="text-lg font-semibold">{item.question}</h3>
                <p className="mt-2 text-muted-foreground">{item.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="border-t border-border bg-muted/60">
        <div className="container mx-auto flex flex-col items-center gap-4 px-6 py-12 text-center">
          <p className="text-sm uppercase tracking-[0.25em] text-emerald-500">
            พร้อมเมื่อคุณพร้อม
          </p>
          <h3 className="text-3xl font-bold">เปิดตัวบอทพร้อมการตลาดได้ทันที</h3>
          <p className="max-w-2xl text-muted-foreground">
            ไม่มีค่าตั้งค่า ไม่ต้องรอทีมวิศวกร ชี้ ChatIQ ไปยังเว็บไซต์การตลาด
            วางสรุปการขายของคุณ แล้วเริ่มเปลี่ยนผู้เยี่ยมชมด้วยคำตอบจากคอนเทนต์ของคุณเอง
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button asChild>
              <Link href="/sign-up">เริ่ม Evaluation</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="gap-2 border-emerald-500 text-emerald-500 hover:bg-emerald-950"
            >
              <Link href={siteUrl} target="_blank" rel="noreferrer">
                เยี่ยมชม {siteUrl.replace("https://", "")}
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
