import { useDrag } from "react-dnd";
import { useEffect } from "react";

export default function DraggableJobLog({ log }) {
  console.log("📦 DraggableJobLog rendered");

  const [{ isDragging }, dragRef] = useDrag(() => ({
    type: "JOB_LOG",
    item: log,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  // Set drag item globally so react-big-calendar can access it via window
  useEffect(() => {
    if (isDragging) {
      window.__externalDragItem = log;
      console.log("🚚 Dragging:", log.title);
    }
  }, [isDragging, log]);

  return (
    <div
      ref={dragRef}
      className={`border p-4 mb-2 rounded shadow-sm cursor-move bg-blue-100 transition-opacity ${
        isDragging ? "opacity-50" : "opacity-100"
      }`}
    >
      <strong>{log.title}</strong>
      <p>{log.description}</p>
      <p className="text-sm text-muted-foreground">
        {log.logDate} at {log.logTime}
      </p>
    </div>
  );
}
