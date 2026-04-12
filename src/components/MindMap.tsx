import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Network, Sparkles } from 'lucide-react';

interface Node {
  id: string;
  label: string;
  type: 'root' | 'sub' | 'leaf';
}

interface Edge {
  from: string;
  to: string;
}

interface MindMapProps {
  data: {
    nodes: Node[];
    edges: Edge[];
  };
}

export function MindMap({ data }: MindMapProps) {
  const { nodes, edges } = data || { nodes: [], edges: [] };

  // Simple layout logic (hierarchical)
  const layoutNodes = useMemo(() => {
    if (!nodes.length) return [];
    
    const root = nodes.find(n => n.type === 'root') || nodes[0];
    const subNodes = nodes.filter(n => n.type === 'sub');
    const leafNodes = nodes.filter(n => n.type === 'leaf' || (!n.type && n.id !== root.id));

    const result: (Node & { x: number, y: number })[] = [];
    
    // Root at center
    result.push({ ...root, x: 400, y: 300 });

    // Subnodes in a circle around root
    subNodes.forEach((node, i) => {
      const angle = (i / subNodes.length) * Math.PI * 2;
      const radius = 150;
      result.push({
        ...node,
        x: 400 + Math.cos(angle) * radius,
        y: 300 + Math.sin(angle) * radius
      });
    });

    // Leaf nodes around their parents (simplified: just another circle)
    leafNodes.forEach((node, i) => {
      const angle = (i / leafNodes.length) * Math.PI * 2;
      const radius = 280;
      result.push({
        ...node,
        x: 400 + Math.cos(angle) * radius,
        y: 300 + Math.sin(angle) * radius
      });
    });

    return result;
  }, [nodes]);

  const nodeMap = useMemo(() => {
    const map: Record<string, typeof layoutNodes[0]> = {};
    layoutNodes.forEach(n => map[n.id] = n);
    return map;
  }, [layoutNodes]);

  if (!nodes.length) return null;

  return (
    <div className="space-y-12 py-16">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 text-xs font-bold uppercase tracking-widest">
          <Sparkles className="w-3.5 h-3.5" />
          Visual Structure
        </div>
        <h2 className="text-4xl font-serif font-light text-slate-900 dark:text-white tracking-tight">Concept Mind Map</h2>
        <p className="text-slate-500 dark:text-slate-400 max-w-lg mx-auto">Visualize the connections between different topics and subtopics.</p>
      </div>

      <div className="relative w-full aspect-[4/3] max-w-4xl mx-auto bg-slate-50 dark:bg-slate-900/50 rounded-[3rem] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-inner">
        <svg viewBox="0 0 800 600" className="w-full h-full">
          {/* Edges */}
          {edges.map((edge, i) => {
            const from = nodeMap[edge.from];
            const to = nodeMap[edge.to];
            if (!from || !to) return null;
            return (
              <motion.line
                key={`edge-${i}`}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 1, delay: i * 0.1 }}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke="currentColor"
                strokeWidth="2"
                className="text-slate-300 dark:text-slate-700"
                strokeDasharray="5,5"
              />
            );
          })}

          {/* Nodes */}
          {layoutNodes.map((node, i) => (
            <motion.g
              key={node.id}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', delay: i * 0.05 }}
            >
              <circle
                cx={node.x}
                cy={node.y}
                r={node.type === 'root' ? 45 : node.type === 'sub' ? 35 : 25}
                className={`${
                  node.type === 'root' 
                    ? 'fill-indigo-500 shadow-xl' 
                    : node.type === 'sub'
                      ? 'fill-white dark:fill-slate-800 stroke-indigo-500 stroke-2'
                      : 'fill-white dark:fill-slate-800 stroke-slate-300 dark:stroke-slate-700 stroke-1'
                }`}
              />
              <foreignObject
                x={node.x - 60}
                y={node.y - 40}
                width="120"
                height="80"
              >
                <div className="w-full h-full flex items-center justify-center p-2 text-center">
                  <span className={`text-[10px] leading-tight font-bold tracking-tight ${
                    node.type === 'root' ? 'text-white' : 'text-slate-700 dark:text-slate-300'
                  }`}>
                    {node.label}
                  </span>
                </div>
              </foreignObject>
            </motion.g>
          ))}
        </svg>
      </div>
    </div>
  );
}
