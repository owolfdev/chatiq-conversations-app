export default function MessageBubble({
  role,
  content,
}: {
  role: string;
  content: string;
}) {
  const style =
    role === "user" ? "bg-gray-100 text-black" : "bg-black text-white";
  return (
    <div className={`text-left px-4 py-2 rounded-xl ${style}`}>{content}</div>
  );
}
