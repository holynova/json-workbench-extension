import { json } from "@codemirror/lang-json";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { EditorState } from "@codemirror/state";
import { EditorView, basicSetup } from "codemirror";
import { useEffect, useRef } from "react";

type Language = "json" | "javascript" | "python" | "text";

interface CodeEditorProps {
  value: string;
  onChange?: (value: string) => void;
  readonly?: boolean;
  language?: Language;
  minHeight?: number;
}

export function CodeEditor({ value, onChange, readonly = false, language = "json", minHeight = 240 }: CodeEditorProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
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
    if (!view || view.state.doc.toString() === value) return;
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: value } });
  }, [value]);

  return <div className="editor" ref={hostRef} />;
}

function languageExtension(language: Language) {
  if (language === "javascript") return javascript({ typescript: true });
  if (language === "python") return python();
  if (language === "json") return json();
  return [];
}

