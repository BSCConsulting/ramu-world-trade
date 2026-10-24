#!/usr/bin/env python3
"""Main Entry Point for World of Trade Intelligence Engine.
Ask any trade question in plain English to get a triangulated, audit-backed response.
"""
import sys
from triangulator import engine

def ask(question: str) -> str:
    """Core function to query the engine programmatically."""
    if not question.strip():
        return "Please provide a valid trade question."
    return engine.answer_question(question)

def main():
    if len(sys.argv) > 1:
        arg = " ".join(sys.argv[1:])
        if arg == "--interactive" or arg == "-i":
            print("\n╔════════════════════════════════════════════════════════════════════════╗")
            print("║     WORLD OF TRADE: INDIA TRADE INTELLIGENCE & AUDIT ENGINE             ║")
            print("║     100% Free Tier • Triangulated Statutory Data (DGCI&S, RBI, UN)     ║")
            print("╚════════════════════════════════════════════════════════════════════════╝")
            print("Type your question (or 'exit' / 'quit' to stop):\n")
            while True:
                try:
                    q = input("Question > ").strip()
                    if not q:
                        continue
                    if q.lower() in ["exit", "quit", "q"]:
                        print("Exiting World of Trade engine. Goodbye!")
                        break
                    print("\n" + ask(q) + "\n" + "-"*75 + "\n")
                except (KeyboardInterrupt, EOFError):
                    print("\nExiting.")
                    break
        else:
            print(ask(arg))
    else:
        # Default showcase if run without arguments
        print(ask("What are India's overall trade totals and deficit?"))

if __name__ == "__main__":
    main()
