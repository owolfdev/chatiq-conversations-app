// src/app/(site)/pricing/th/page.tsx
import type { ReactNode } from "react";
import type { Metadata } from "next";
import { PricingCardButton } from "@/components/home/pricing-card-button";
import { fetchPlanPrice, formatRecurringInterval } from "@/lib/pricing";
import { formatCurrency } from "@/lib/formatters";
import { headers } from "next/headers";
import { detectCurrencyFromHeaders } from "@/lib/geo/currency";

export const metadata: Metadata = {
  title: "แผนราคา",
  description:
    "ดูราคา ChatIQ สำหรับแพ็กเกจ Evaluation, Pro และ Team พร้อมขีดจำกัดการใช้งานที่ชัดเจน",
  alternates: {
    canonical: "/pricing/th",
  },
  openGraph: {
    title: "แผนราคา ChatIQ",
    description:
      "ดูราคา ChatIQ สำหรับแพ็กเกจ Evaluation, Pro และ Team พร้อมขีดจำกัดการใช้งานที่ชัดเจน",
    url: "/pricing/th",
    siteName: "ChatIQ",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "แผนราคา ChatIQ",
    description:
      "ดูราคา ChatIQ สำหรับแพ็กเกจ Evaluation, Pro และ Team พร้อมขีดจำกัดการใช้งานที่ชัดเจน",
  },
};

const formatIntervalThai = (interval: string | null) => {
  if (!interval) {
    return null;
  }

  switch (interval) {
    case "/day":
      return "/วัน";
    case "/week":
      return "/สัปดาห์";
    case "/month":
      return "/เดือน";
    case "/year":
      return "/ปี";
    default:
      return interval;
  }
};

export default async function PricingPageThai() {
  // During build, skip Stripe API calls and use fallback values
  // At runtime, fetch actual prices from Stripe
  const isBuildTime = process.env.NEXT_PHASE === "phase-production-build";

  // Detect currency based on user's location
  const headersList = await headers();
  const currency = detectCurrencyFromHeaders(headersList);

  let proPriceAmount = currency === "thb" ? "฿699" : "$29";
  let proPriceSuffix = "/เดือน";
  let teamPriceAmount = currency === "thb" ? "฿1,699" : "$79";
  let teamPriceSuffix = "/เดือน";

  if (!isBuildTime) {
    // Only fetch from Stripe at runtime (not during build)
    // Use live mode in production, test mode otherwise
    try {
      const proPrice = await fetchPlanPrice({
        plan: "pro",
        currency,
        useLive: process.env.NODE_ENV === "production",
      });
      if (proPrice) {
        const formattedPrice = proPrice.unitAmount
          ? formatCurrency(proPrice.unitAmount, proPrice.currency)
          : null;
        proPriceAmount = formattedPrice ?? proPriceAmount;
        const formattedSuffix = formatIntervalThai(
          formatRecurringInterval(proPrice.interval)
        );
        proPriceSuffix = formattedSuffix ?? proPriceSuffix;
      }

      const teamPrice = await fetchPlanPrice({
        plan: "team",
        currency,
        useLive: process.env.NODE_ENV === "production",
      });
      if (teamPrice) {
        const formattedPrice = teamPrice.unitAmount
          ? formatCurrency(teamPrice.unitAmount, teamPrice.currency)
          : null;
        teamPriceAmount = formattedPrice ?? teamPriceAmount;
        const formattedSuffix = formatIntervalThai(
          formatRecurringInterval(teamPrice.interval)
        );
        teamPriceSuffix = formattedSuffix ?? teamPriceSuffix;
      }
    } catch (error) {
      console.error("Failed to fetch pricing from Stripe:", error);
      // Use fallback values on error
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            ราคาเข้าใจง่ายและโปร่งใส
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            เลือกแผนที่เหมาะกับคุณ ทุกแผนมี Evaluation 14 วันโดยไม่ต้องใช้บัตรเครดิต
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
          <PricingCard
            title="Evaluation"
            price="$0"
            priceSuffix="/ประเมินผล"
            description="Evaluation 14 วันเพื่อยืนยันความเหมาะสม ทดลองเคสจริง และเห็นว่า ChatIQ ช่วยทีมของคุณได้อย่างไร"
            features={[
              "1 แชตบอท",
              "เอกสารอัจฉริยะสำหรับความรู้ของบอท",
              "ไม่ต้องใช้บัตรเครดิต",
              "สำหรับการทดสอบเท่านั้น (อัปเกรดเพื่อใช้งานจริง)",
            ]}
            buttonText="เริ่มต้นใช้งาน"
            buttonVariant="outline"
            plan="free"
            currency={currency}
          />
          <PricingCard
            title="โปร"
            price={proPriceAmount}
            priceSuffix={proPriceSuffix}
            description="เหมาะสำหรับผู้ประกอบการเดี่ยวและธุรกิจขนาดเล็ก"
            features={[
              "1 บัญชีผู้ใช้",
              "สูงสุด 3 แชตบอท พร้อมความรู้และบุคลิกเฉพาะ",
              "ฝังบอทได้ทุกที่ (ช่องทางไม่จำกัด)",
              "2,000 AI calls ต่อเดือน (ใช้ร่วมกันทุกบอท)",
              "เอกสารความรู้สูงสุด 50 รายการ",
              "คำตอบที่ตั้งค่าไว้ล่วงหน้า",
            ]}
            buttonText="เริ่มต้นใช้งาน Pro"
            buttonVariant="default"
            plan="pro"
            currency={currency}
          />
          <PricingCard
            title="Team"
            price={teamPriceAmount}
            priceSuffix={teamPriceSuffix}
            description="สำหรับทีมที่กำลังเติบโต หลายสาขา หรือหลายโลเคชัน"
            features={[
              "สมาชิกทีมสูงสุด 5 คน",
              "สูงสุด 10 แชตบอท (เหมาะสำหรับหลายแผนก หลายแบรนด์ หรือหลายลูกค้า)",
              "ฝังบอทได้ทุกที่ (ช่องทางไม่จำกัด)",
              "10,000 AI calls ต่อเดือน (ใช้ร่วมกันทั้งทีมและทุกบอท)",
              "เอกสารความรู้สูงสุด 200 รายการ",
              "การทำงานร่วมกันของทีมและสิทธิ์ตามบทบาท",
              "แดชบอร์ดวิเคราะห์ขั้นสูง",
              "สามารถอัปเกรดเพิ่มผู้ใช้ได้",
            ]}
            buttonText="เริ่มต้นใช้งาน Team"
            buttonVariant="default"
            plan="team"
            highlighted
            currency={currency}
          />
          <PricingCard
            title="Business (Custom)"
            price="ราคาแบบกำหนดเอง"
            priceSuffix={null}
            description="กำหนดขอบเขตและแผนเปิดตัวให้เหมาะกับระบบและเป้าหมายของคุณ"
            features={[
              "วิศวกรเฉพาะทางออกแบบและทำอินทิเกรชันแบบกำหนดเอง",
              "ฟีเจอร์ แดชบอร์ด และเวิร์กโฟลว์ที่ปรับให้เหมาะกับคุณ",
              "ดีพลอยให้สอดคล้องกับระบบ ความปลอดภัย และข้อมูลของคุณ",
              "ผู้ใช้ แชตบอท และการใช้งาน API ไม่จำกัด",
              "ความปลอดภัยระดับองค์กร: SSO การปฏิบัติตามข้อกำหนด และบันทึกการตรวจสอบ",
              "รับประกัน SLA พร้อมซัพพอร์ตเร่งด่วน 24/7",
              "เข้าถึงทีมวิศวกรโดยตรง",
              "มีตัวเลือกไวท์เลเบลเมื่อร้องขอ",
            ]}
            buttonText="สร้างโซลูชันแบบกำหนดเอง"
            buttonVariant="outline"
            plan="enterprise"
            currency={currency}
          />
        </div>

        <div className="max-w-4xl mx-auto mt-12 rounded-lg border border-border bg-muted/30 p-6">
          <h2 className="text-xl md:text-2xl font-semibold mb-2">
            แชตบอทคืออะไร?
          </h2>
          <p className="text-muted-foreground">
            ใน ChatIQ แชตบอทคือเครื่องมือธุรกิจที่คุณให้ความรู้เพื่อทำงานเฉพาะ
            เช่น ซัพพอร์ต การขาย หรือช่วยงานภายใน คุณสามารถสร้างบอทหลายตัวและกำหนด
            ความรู้ โทนเสียง และเป้าหมายให้ต่างกันได้ บอทแต่ละตัวสามารถฝังได้ทุกช่องทาง
            (เว็บไซต์ Line และช่องทางโซเชียลอื่นๆ เป็นต้น)
          </p>
          <div className="mt-4 text-muted-foreground">
            ตัวอย่าง: บอทซัพพอร์ตลูกค้าและบอทช่วยทีมภายใน บอทขายและบอทคู่มือเทคนิค
            หรือบอทแยกตามแบรนด์หรือแผนก
          </div>
        </div>

        <div className="mt-16 text-center">
          <p className="text-sm text-muted-foreground">
            มีคำถามใช่ไหม?{" "}
            <a
              href="/contact"
              className="text-emerald-600 hover:text-emerald-700 underline"
            >
              ติดต่อทีมขายของเรา
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

function PricingCard({
  title,
  price,
  priceSuffix = "/เดือน",
  description,
  features,
  buttonText,
  buttonVariant = "default",
  highlighted = false,
  plan,
  currency,
}: {
  title: string;
  price: string;
  priceSuffix?: string | null;
  description: string;
  features: string[];
  buttonText: string;
  buttonVariant?: "default" | "outline";
  highlighted?: boolean;
  plan?: "free" | "pro" | "team" | "enterprise";
  currency?: "usd" | "thb";
}) {
  return (
    <div
      className={`p-8 rounded-lg border ${
        highlighted
          ? "border-emerald-500 bg-muted/80"
          : "border-border bg-muted/30"
      } flex flex-col justify-between`}
    >
      {highlighted ? (
        <span className="text-xs font-semibold tracking-wide uppercase text-emerald-600 mb-2">
          ยอดนิยมที่สุด
        </span>
      ) : null}
      <h3 className="text-2xl font-bold mb-2">{title}</h3>
      <div className="flex items-baseline mb-4">
        <span className="text-4xl font-bold">{price}</span>
        {priceSuffix ? (
          <span className="text-muted-foreground ml-2">{priceSuffix}</span>
        ) : null}
      </div>
      <p className="text-muted-foreground mb-6">{description}</p>
      <ul className="space-y-3 mb-8">
        {features.map((feature) => (
          <li key={feature} className="flex items-start">
            <svg
              aria-label={`${feature} icon`}
              aria-hidden="true"
              className="h-5 w-5 text-emerald-500 mr-2 flex-shrink-0 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            {feature}
          </li>
        ))}
      </ul>
      <PricingCardButton
        plan={plan}
        buttonText={buttonText}
        buttonVariant={buttonVariant}
        currency={currency}
      />
    </div>
  );
}
