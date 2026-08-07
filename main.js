/**
 * Inline Paste for Claude — main.js
 *
 * claude.ai の入力欄への長文ペーストが添付ファイル化されるのを防ぎ、
 * 全文をそのままエディタに段落として挿入する。
 *
 * 設計方針:
 *   - window の capture フェーズで paste を先取り(document_start + MAIN world)
 *   - 介入条件を満たさない場合は「何もしない」= サイトの通常動作に素通し
 *   - el.editor (TipTap) が見つからない場合も素通し(UI改修時は添付化に退行するだけ)
 *   - 外部通信なし / chrome.* API 不使用 / 追加権限ゼロ
 */
(() => {
  'use strict';

  // ---- 介入する閾値(これ未満の短文はサイトの通常動作に任せる) ----
  const CHAR_THRESHOLD = 1000; // 文字数
  const LINE_THRESHOLD = 5;    // 行数

  const handler = (e) => {
    try {
      // ペースト先が claude.ai のメッセージエディタ(TipTap/ProseMirror)か
      const target = e.target instanceof Element ? e.target : null;
      const editorEl = target?.closest?.(
        'div.tiptap.ProseMirror[contenteditable="true"]'
      );
      if (!editorEl) return; // 検索窓・タイトル欄など他の入力先には触らない

      const dt = e.clipboardData;
      if (!dt) return;

      // 画像・ファイルのペーストはサイトの添付機能に任せる
      if (dt.files && dt.files.length > 0) return;
      for (const item of dt.items || []) {
        if (item.kind === 'file') return;
      }

      const raw = dt.getData('text/plain');
      if (!raw) return;

      const text = raw.replace(/\r\n?/g, '\n'); // 改行コード正規化
      const lines = text.split('\n');
      if (text.length < CHAR_THRESHOLD && lines.length < LINE_THRESHOLD) {
        return; // 短文は通常動作(サイト側のスマートな貼り付け処理を尊重)
      }

      // TipTap エディタインスタンス。見つからなければ介入しない(native 退行)
      const editor = editorEl.editor;
      if (!editor || !editor.commands || !editor.view) return;

      // ここから先はこの拡張が責任を持つ:
      // サイト側の添付化ハンドラ(body/editor 層)に届く前に止める
      e.preventDefault();
      e.stopImmediatePropagation();

      try {
        // 行ごとに paragraph ノードを構築して一括挿入
        // (実測: 100k字で約100ms・文字欠落ゼロ・構造的に正しい)
        const content = lines.map((line) => ({
          type: 'paragraph',
          content: line ? [{ type: 'text', text: line }] : [],
        }));
        editor.commands.insertContent(content);
      } catch (fallbackErr) {
        // フォールバック: コードブロック内など段落挿入が
        // 拒否されるコンテキストでは生テキストを transaction で挿入
        const view = editor.view;
        const { state } = view;
        view.dispatch(
          state.tr.insertText(text, state.selection.from, state.selection.to)
        );
      }
    } catch (err) {
      // 拡張の不具合でページを壊さない。preventDefault 前の例外なら
      // サイトの通常動作がそのまま続行される
      console.warn('[inline-paste-for-claude]', err);
    }
  };

  window.addEventListener('paste', handler, true);
})();
