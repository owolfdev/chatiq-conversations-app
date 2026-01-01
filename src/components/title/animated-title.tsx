//src/components/title/animated-title.tsx

export default function StaticTitle() {
  const fullText = "CHATIQ";

  return (
    <div className="relative">
      {/* <h1 className="text-8xl font-bold bg-gradient-to-r from-pink-400 via-emerald-400 to-cyan-400 bg-clip-text text-transparent mb-4 font-mono"> */}
      <h1 className="text-8xl font-bold text-emerald-500 mb-4 font-mono">
        {fullText}
      </h1>
      {/* </h1> */}

      {/* Glitch effect overlay */}
      <div className="absolute inset-0 pointer-events-none">
        <h1 className="text-8xl font-bold text-pink-400/20 mb-4 font-mono animate-pulse">
          {fullText}
        </h1>
      </div>
    </div>
  );
}

// "use client";

// import { useState, useEffect } from "react";

// export default function AnimatedTitle() {
//   const [displayText, setDisplayText] = useState("");
//   const [currentIndex, setCurrentIndex] = useState(0);
//   //   const [isDeleting, setIsDeleting] = useState(false);
//   const [showCursor, setShowCursor] = useState(true);

//   const fullText = "CHATIQ";
//   const typingSpeed = 150;

//   useEffect(() => {
//     const timer = setTimeout(() => {
//       if (currentIndex < fullText.length) {
//         setDisplayText(fullText.substring(0, currentIndex + 1));
//         setCurrentIndex(currentIndex + 1);
//       }
//     }, typingSpeed);

//     return () => clearTimeout(timer);
//   }, [currentIndex, fullText]);

//   useEffect(() => {
//     const cursorTimer = setInterval(() => {
//       setShowCursor((prev) => !prev);
//     }, 500);

//     return () => clearInterval(cursorTimer);
//   }, []);

//   return (
//     <div className="relative">
//       <h1 className="text-8xl font-bold bg-gradient-to-r from-pink-400 via-emerald-400 to-cyan-400 bg-clip-text text-transparent mb-4 font-mono">
//         {displayText}
//         <span
//           className={`inline-block w-1 h-20 bg-emerald-400 ml-2 ${
//             showCursor ? "opacity-100" : "opacity-0"
//           } transition-opacity duration-100`}
//         />
//       </h1>

//       {/* Glitch effect overlay */}
//       <div className="absolute inset-0 pointer-events-none">
//         <h1 className="text-8xl font-bold text-pink-400/20 mb-4 font-mono animate-pulse">
//           {displayText}
//         </h1>
//       </div>
//     </div>
//   );
// }
