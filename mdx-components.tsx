import type { ComponentPropsWithoutRef } from "react";
import type { MDXComponents } from "mdx/types";
import Image from "next/image";
import { Button } from "@/components/ui/button";

const DEFAULT_IMAGE_WIDTH = 1200;
const DEFAULT_IMAGE_HEIGHT = 675;
const MDX_IMAGE_MAX_HEIGHT = 700;

const headingStyles = {
  h1: "mt-10 text-6xl font-bold",
  h2: "mt-8 text-4xl font-bold",
  h3: "mt-6 text-2xl font-bold",
  h4: "mt-5 text-xl font-bold",
  h5: "mt-4 text-lg font-bold",
  h6: "mt-3 text-base font-bold",
};

const resolveDimension = (
  value: ComponentPropsWithoutRef<"img">["width"],
  fallback: number
) => {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }

  return fallback;
};

const MdxImage = ({
  src,
  alt,
  width,
  height,
  className,
  style,
  ...props
}: ComponentPropsWithoutRef<"img">) => {
  if (!src) {
    return null;
  }

  const resolvedWidth = resolveDimension(width, DEFAULT_IMAGE_WIDTH);
  const resolvedHeight = resolveDimension(height, DEFAULT_IMAGE_HEIGHT);
  const mergedClassName = ["w-full h-auto object-contain", className]
    .filter(Boolean)
    .join(" ");

  return (
    <span className="my-6 block w-full">
      <Image
        src={typeof src === "string" ? src : ""}
        alt={alt ?? ""}
        width={resolvedWidth}
        height={resolvedHeight}
        sizes="(max-width: 768px) 100vw, 896px"
        className={mergedClassName}
        style={{
          ...style,
          maxHeight: `${MDX_IMAGE_MAX_HEIGHT}px`,
          width: "100%",
          height: "auto",
        }}
        {...props}
      />
    </span>
  );
};

export function useMDXComponents(
  components: MDXComponents = {}
): MDXComponents {
  return {
    h1: (props) => <h1 className={headingStyles.h1} {...props} />,
    h2: (props) => <h2 className={headingStyles.h2} {...props} />,
    h3: (props) => <h3 className={headingStyles.h3} {...props} />,
    h4: (props) => <h4 className={headingStyles.h4} {...props} />,
    h5: (props) => <h5 className={headingStyles.h5} {...props} />,
    h6: (props) => <h6 className={headingStyles.h6} {...props} />,
    p: (props) => <p className="mt-4 text-base leading-relaxed" {...props} />,
    div: (props) => <div className="mt-4" {...props} />,
    hr: (props) => <hr className="my-4" {...props} />,
    code: (props) => (
      <code
        className="wrap-break-word px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-sm font-mono text-pink-600"
        {...props}
      />
    ),
    img: (props) => <MdxImage {...props} />,
    pre: (props) => (
      <pre
        className="my-6 overflow-x-auto whitespace-pre-wrap rounded sm:rounded-md bg-zinc-100 dark:bg-zinc-900 p-4 text-sm leading-relaxed"
        {...props}
      />
    ),
    Button: (props) => <Button {...props} />,
    ...components,
  };
}
