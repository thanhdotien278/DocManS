"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { ModalDialog } from "@/components/ui/modal-dialog";

export type ConfirmOptions = {
  title?: string;
  confirmLabel?: string;
  tone?: "primary" | "danger";
};

export type AskReasonOptions = ConfirmOptions & {
  label?: string;
  defaultValue?: string;
  optional?: boolean;
};

type Request =
  | { kind: "confirm" | "notice"; message: string; options: ConfirmOptions; resolve: (value: boolean) => void }
  | { kind: "ask"; message: string; options: AskReasonOptions; resolve: (value: string | null) => void };

type DialogApi = {
  confirm: (message: string, options?: ConfirmOptions) => Promise<boolean>;
  notice: (message: string, title?: string) => Promise<void>;
  askReason: (message: string, options?: AskReasonOptions) => Promise<string | null>;
};

const DialogContext = createContext<DialogApi | null>(null);

/** Hộp xác nhận, hộp thông báo và hộp nhập lý do dùng chung toàn ứng dụng. */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<Request | null>(null);
  const [text, setText] = useState("");

  const confirm = useCallback<DialogApi["confirm"]>(
    (message, options = {}) => new Promise<boolean>((resolve) => setRequest({ kind: "confirm", message, options, resolve })),
    []
  );
  const notice = useCallback<DialogApi["notice"]>(
    (message, title) => new Promise<void>((resolve) => setRequest({ kind: "notice", message, options: { title }, resolve: () => resolve() })),
    []
  );
  const askReason = useCallback<DialogApi["askReason"]>(
    (message, options = {}) =>
      new Promise<string | null>((resolve) => {
        setText(options.defaultValue ?? "");
        setRequest({ kind: "ask", message, options, resolve });
      }),
    []
  );

  function close(accepted: boolean) {
    if (!request) return;
    if (request.kind === "ask") request.resolve(accepted ? text.trim() : null);
    else request.resolve(accepted);
    setRequest(null);
  }

  const options = request?.options;
  const canAccept = request?.kind !== "ask" || (request.options as AskReasonOptions).optional || text.trim().length > 0;

  return (
    <DialogContext.Provider value={{ confirm, notice, askReason }}>
      {children}
      {request && options ? (
        <ModalDialog
          title={options.title ?? (request.kind === "notice" ? "Thông báo" : "Xác nhận thao tác")}
          onClose={() => close(false)}
          footer={
            <div className="button-row">
              {request.kind !== "notice" ? (
                <button type="button" className="button" onClick={() => close(false)}>
                  Hủy
                </button>
              ) : null}
              <button
                type="button"
                className={`button ${options.tone === "danger" ? "danger" : "primary"}`}
                disabled={!canAccept}
                onClick={() => close(true)}
              >
                {request.kind === "notice" ? "Đã hiểu" : options.confirmLabel ?? "Đồng ý"}
              </button>
            </div>
          }
        >
          <p className="confirm-message">{request.message}</p>
          {request.kind === "ask" ? (
            <label className="field">
              <span>{(request.options as AskReasonOptions).label ?? "Lý do"}</span>
              <textarea rows={3} value={text} onChange={(event) => setText(event.target.value)} />
            </label>
          ) : null}
        </ModalDialog>
      ) : null}
    </DialogContext.Provider>
  );
}

function useDialogApi() {
  const api = useContext(DialogContext);
  if (!api) throw new Error("Cần bọc ứng dụng trong <ConfirmProvider>.");
  return api;
}

export function useConfirm() {
  return useDialogApi().confirm;
}

export function useNotice() {
  return useDialogApi().notice;
}

export function useAskReason() {
  return useDialogApi().askReason;
}
