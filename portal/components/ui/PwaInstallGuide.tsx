"use client";
import { useState, useEffect } from "react";
import { Download, X } from "lucide-react";

function isIOS() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function PwaInstallGuide() {
  const [show, setShow] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    setIsIos(isIOS());
  }, []);

  if (!isIos) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setShow(true)}
        className="flex items-center gap-2 text-sm text-primary-500 font-semibold mx-auto mt-4 hover:text-primary-700 transition-colors"
      >
        <Download size={16} />
        Baixar como aplicativo
      </button>

      {show && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShow(false)} />
          <div className="relative z-10 w-full max-w-sm mx-4 mb-4 rounded-2xl bg-background border border-border p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-black text-foreground">Instalar no iPhone</h2>
              <button
                onClick={() => setShow(false)}
                className="text-muted hover:text-foreground"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-sm text-muted mb-5">
              No iPhone, a instalação é feita pelo Safari em 3 passos:
            </p>

            <ol className="space-y-4">
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary-100 text-primary-600 font-black text-sm flex items-center justify-center">1</span>
                <div>
                  <p className="text-sm font-semibold text-foreground">Toque no botão Compartilhar</p>
                  <p className="text-xs text-muted mt-0.5">O ícone de quadrado com seta para cima, na barra inferior do Safari.</p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary-100 text-primary-600 font-black text-sm flex items-center justify-center">2</span>
                <div>
                  <p className="text-sm font-semibold text-foreground">Toque em &quot;Adicionar à Tela de Início&quot;</p>
                  <p className="text-xs text-muted mt-0.5">Role o menu para baixo até encontrar essa opção.</p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary-100 text-primary-600 font-black text-sm flex items-center justify-center">3</span>
                <div>
                  <p className="text-sm font-semibold text-foreground">Toque em &quot;Adicionar&quot;</p>
                  <p className="text-xs text-muted mt-0.5">O app aparecerá na sua tela inicial como qualquer outro aplicativo.</p>
                </div>
              </li>
            </ol>
          </div>
        </div>
      )}
    </>
  );
}
