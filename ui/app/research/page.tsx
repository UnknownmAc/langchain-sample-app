"use client";

import { useState, useRef, useEffect } from "react";
import styles from "./page.module.css";

interface ResearchResult {
  success: boolean;
  topic: string;
  synthesis: string;
  stats: {
    iterations: number;
    queriesGenerated: number;
    documentsSearched: number;
    documentsGraded: number;
    relevantDocuments: number;
  };
  relevantSources: Array<{
    title: string;
    url: string;
    relevanceScore: number;
  }>;
  logs: string[];
  error?: string;
}

export default function ResearchPage() {
  const [topic, setTopic] = useState("");
  const [isResearching, setIsResearching] = useState(false);
  const [result, setResult] = useState<ResearchResult | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const handleResearch = async () => {
    if (!topic.trim() || isResearching) return;

    setIsResearching(true);
    setResult(null);
    setError(null);
    setLogs(["🚀 Starting research..."]);

    try {
      const response = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: topic.trim(),
          config: {
            maxIterations: 3,
            qualityThreshold: 0.5,
            minRelevantDocs: 2,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Research failed");
      }

      setResult(data);
      setLogs(data.logs || []);
    } catch (err) {
      setError((err as Error).message);
      setLogs((prev) => [...prev, `❌ Error: ${(err as Error).message}`]);
    } finally {
      setIsResearching(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleResearch();
    }
  };

  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <header className={styles.header}>
          <div className={styles.headerContent}>
            <a href="/" className={styles.backLink}>← Back to Chat</a>
            <h1>🔬 Autonomous Research Agent</h1>
            <p className={styles.subtitle}>
              Cyclic workflows • Iterative search • Document grading • Auto-synthesis
            </p>
          </div>
        </header>

        <div className={styles.workflowDiagram}>
          <h3>How it works:</h3>
          <div className={styles.workflow}>
            <span className={styles.step}>Generate Queries</span>
            <span className={styles.arrow}>→</span>
            <span className={styles.step}>Search</span>
            <span className={styles.arrow}>→</span>
            <span className={styles.step}>Grade Relevance</span>
            <span className={styles.arrow}>→</span>
            <span className={styles.step}>
              Decide
              <span className={styles.cycle}>↺ or ✓</span>
            </span>
            <span className={styles.arrow}>→</span>
            <span className={styles.step}>Synthesize</span>
          </div>
        </div>

        <div className={styles.inputSection}>
          <label htmlFor="topic" className={styles.label}>
            Research Topic
          </label>
          <div className={styles.inputWrapper}>
            <input
              id="topic"
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g., LangChain agents and tools, Machine learning fundamentals..."
              className={styles.input}
              disabled={isResearching}
            />
            <button
              onClick={handleResearch}
              disabled={isResearching || !topic.trim()}
              className={styles.button}
            >
              {isResearching ? (
                <>
                  <span className={styles.spinner}></span>
                  Researching...
                </>
              ) : (
                "🔍 Start Research"
              )}
            </button>
          </div>
          <p className={styles.hint}>
            The agent will iteratively search, grade, and refine until it finds enough relevant information.
          </p>
        </div>

        {/* Progress Logs */}
        {logs.length > 0 && (
          <div className={styles.logsSection}>
            <h3>📋 Research Progress</h3>
            <div className={styles.logs}>
              {logs.map((log, index) => (
                <div key={index} className={styles.logEntry}>
                  {log}
                </div>
              ))}
              {isResearching && (
                <div className={styles.logEntry}>
                  <span className={styles.spinner}></span> Working...
                </div>
              )}
              <div ref={logsEndRef} />
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className={styles.error}>
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Results */}
        {result && result.success && (
          <div className={styles.results}>
            <div className={styles.stats}>
              <h3>📊 Research Statistics</h3>
              <div className={styles.statsGrid}>
                <div className={styles.stat}>
                  <span className={styles.statValue}>{result.stats.iterations}</span>
                  <span className={styles.statLabel}>Iterations</span>
                </div>
                <div className={styles.stat}>
                  <span className={styles.statValue}>{result.stats.queriesGenerated}</span>
                  <span className={styles.statLabel}>Queries</span>
                </div>
                <div className={styles.stat}>
                  <span className={styles.statValue}>{result.stats.documentsSearched}</span>
                  <span className={styles.statLabel}>Searched</span>
                </div>
                <div className={styles.stat}>
                  <span className={styles.statValue}>{result.stats.relevantDocuments}</span>
                  <span className={styles.statLabel}>Relevant</span>
                </div>
              </div>
            </div>

            <div className={styles.synthesis}>
              <h3>📝 Research Synthesis</h3>
              <div className={styles.synthesisContent}>
                {result.synthesis.split("\n").map((paragraph, i) => (
                  <p key={i}>{paragraph}</p>
                ))}
              </div>
            </div>

            {result.relevantSources.length > 0 && (
              <div className={styles.sources}>
                <h3>📚 Relevant Sources</h3>
                <ul className={styles.sourceList}>
                  {result.relevantSources.map((source, index) => (
                    <li key={index} className={styles.source}>
                      <span className={styles.sourceScore}>
                        {(source.relevanceScore * 100).toFixed(0)}%
                      </span>
                      <a 
                        href={source.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className={styles.sourceLink}
                      >
                        {source.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Example Topics */}
        {!result && !isResearching && (
          <div className={styles.examples}>
            <h3>Try these topics:</h3>
            <div className={styles.exampleButtons}>
              {[
                "LangChain agents and tools",
                "Machine learning fundamentals",
                "React best practices",
                "Kubernetes architecture",
              ].map((example) => (
                <button
                  key={example}
                  onClick={() => setTopic(example)}
                  className={styles.exampleButton}
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

