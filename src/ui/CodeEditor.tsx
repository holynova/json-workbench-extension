import { json } from "@codemirror/lang-json";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { Compartment, EditorState, RangeSetBuilder } from "@codemirror/state";
import { Decoration } from "@codemirror/view";
import { EditorView, basicSetup } from "codemirror";
import { useEffect, useRef } from "react";

type Language = "json" | "javascript" | "python" | "text";

interface CodeEditorProps {
  value: string;
  onChange?: (value: string) => void;
  readonly?: boolean;
  language?: Language;
  minHeight?: number;
  errorLine?: number;
  errorColumn?: number;
  className?: string;
}

export function CodeEditor({ value, onChange, readonly = false, language = "json", minHeight = 240, errorLine, errorColumn, className }: CodeEditorProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const errorHighlightRef = useRef(new Compartment());
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!hostRef.current) return;
    const view = new EditorView({
      parent: hostRef.current,
      state: EditorState.create({
        doc: value,
        extensions: [
          basicSetup,
          languageExtension(language),
          EditorView.editable.of(!readonly),
          EditorState.readOnly.of(readonly),
          errorHighlightRef.current.of(errorHighlightExtension(errorLine, errorColumn)),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) onChangeRef.current?.(update.state.doc.toString());
          }),
          EditorView.theme({
            "&": { minHeight: `${minHeight}px`, fontSize: "13px" },
            ".cm-scroller": { fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }
          })
        ]
      })
    });
    viewRef.current = view;
    return () => view.destroy();
  }, [language, minHeight, readonly]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      effects: errorHighlightRef.current.reconfigure(errorHighlightExtension(errorLine, errorColumn))
    });
  }, [errorLine, errorColumn]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view || view.state.doc.toString() === value) return;
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: value } });
  }, [value]);

  return <div className={className ? `editor ${className}` : "editor"} ref={hostRef} />;
}

function languageExtension(language: Language) {
  if (language === "javascript") return javascript({ typescript: true });
  if (language === "python") return python();
  if (language === "json") return json();
  return [];
}

function errorHighlightExtension(errorLine?: number, errorColumn?: number) {
  return EditorView.decorations.compute([], (state) => {
    if (!errorLine || errorLine < 1 || errorLine > state.doc.lines) return Decoration.none;

    const builder = new RangeSetBuilder<Decoration>();
    const line = state.doc.line(errorLine);
    builder.add(line.from, line.from, Decoration.line({ class: "cm-error-line" }));

    if (errorColumn && errorColumn > 0) {
      const markFrom = Math.min(line.from + errorColumn - 1, line.to);
      const markTo = Math.min(markFrom + 1, line.to);
      if (markTo > markFrom) {
        builder.add(markFrom, markTo, Decoration.mark({ class: "cm-error-token" }));
      }
    }

    return builder.finish();
  });
}
