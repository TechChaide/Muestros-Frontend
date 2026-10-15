'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Camera, UserCheck, XCircle, UserX, RefreshCw } from 'lucide-react';
import { X as XIcon } from 'lucide-react';
import React from 'react';
import { environment } from '@/environments/environments.prod';

const API_BASE_URL = environment.apiAuthFacial;

export function CameraComponent() {
  const searchParams = useSearchParams();
  const codigo = searchParams.get('codigo');
  const nombre = searchParams.get('nombre');

  // Estados usando el patrón exacto del código que funciona
  const [modalOpen, setModalOpen] = React.useState(true); // Se abre automáticamente
  const [hasCamera, setHasCamera] = React.useState(true);
  const [loading, setLoading] = React.useState(false);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [error, setError] = React.useState("");
  const [counter, setCounter] = React.useState(3);
  const [videoReady, setVideoReady] = React.useState(false);
  const [validationResult, setValidationResult] = React.useState<any>(null);
  // Espejamos el video SOLO si la cámara activa es la frontal. Si la
  // cámara es la trasera, no espejamos (espejar la trasera invierte el
  // movimiento: moverte a la izquierda hace que la imagen vaya a la
  // derecha).
  const [isFrontCamera, setIsFrontCamera] = React.useState(true);
  const { toast } = useToast();

  // Calcular progreso para el spinner circular exterior
  const progress = counter > 0 ? ((3 - counter) / 3) * 100 : 100;
  const progressColor = "#0055b8";

  // Abrir cámara cuando el modal se muestra - CÓDIGO EXACTO QUE FUNCIONA
  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    if (modalOpen) {
      setVideoReady(false);
      interval = setInterval(() => {
        if (videoRef.current) {
          if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices
              .getUserMedia({ video: true })
              .then((stream) => {
                if (videoRef.current) {
                  videoRef.current.srcObject = stream;
                  // Detectamos si el stream activo es la cámara frontal para
                  // espejar el video solo en ese caso. Si es trasera, NO
                  // espejamos (espejar la trasera invierte el movimiento y
                  // confunde al usuario al centrar el rostro / la etiqueta).
                  const track = stream.getVideoTracks?.()[0];
                  const settings = track?.getSettings?.() as
                    | MediaTrackSettings
                    | undefined;
                  // `facingMode` puede ser "user" (frontal) o "environment"
                  // (trasera). Si el navegador no lo reporta, caemos al
                  // default (frontal).
                  const facing =
                    settings?.facingMode ?? "user";
                  setIsFrontCamera(facing === "user");
                  // Esperar a que el video esté listo
                  videoRef.current.onloadedmetadata = () => {
                    setVideoReady(true);
                  };
                }
                clearInterval(interval);
              })
              .catch(() => {
                setError("No se pudo acceder a la cámara.");
                clearInterval(interval);
              });
          } else {
            setError("Este navegador no soporta acceso a la cámara.");
            clearInterval(interval);
          }
        }
      }, 100);
      return () => {
        clearInterval(interval);
      };
    }
  }, [modalOpen]);

  // Contador automático para tomar foto - CÓDIGO EXACTO QUE FUNCIONA
  React.useEffect(() => {
    let timer: NodeJS.Timeout;
    if (videoReady && modalOpen) {
      setCounter(3);
      timer = setInterval(() => {
        setCounter((prev) => {
          if (prev > 1) return prev - 1;
          clearInterval(timer);
          handleTakePhoto();
          return 0;
        });
      }, 1000);
    }
    return () => {
      clearInterval(timer);
    };
  }, [videoReady, modalOpen]);

  // Detectar disponibilidad de cámara - CÓDIGO EXACTO QUE FUNCIONA
  React.useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then(() => setHasCamera(true))
      .catch(() => setHasCamera(false));
  }, []);

  // Función para tomar la foto - ADAPTADA DEL CÓDIGO QUE FUNCIONA
  const handleTakePhoto = async () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(async (blob) => {
        if (blob) {
          setLoading(true);
          let shouldCloseModal = true;
          try {
            const formData = new FormData();
            formData.append('codigo', codigo || '');
            formData.append('foto', blob, `captured_${Date.now()}.jpg`);
            
            const response = await fetch(`${API_BASE_URL}/validate_face2`, {
              method: 'POST',
              body: formData,
            });

            const result = await response.json();

            if (response.ok) {
              setValidationResult(result);
            } else {
              throw new Error(result.message || 'Error en la validación');
            }
          } catch (e: any) {
            setError(`No se pudo validar el rostro: ${e.message}`);
            setValidationResult({ 
              status: 'denied', 
              message: e.message || "No se pudo validar el rostro" 
            });
          } finally {
            setLoading(false);
            if (shouldCloseModal) {
              setModalOpen(false);
              // Detener la cámara
              if (video.srcObject) {
                (video.srcObject as MediaStream)
                  .getTracks()
                  .forEach((track) => track.stop());
              }
            }
          }
        }
      }, "image/jpeg");
    }
  };

  // Función para cerrar modal - CÓDIGO EXACTO QUE FUNCIONA
  const handleCloseModal = () => {
    setModalOpen(false);
    if (videoRef.current && videoRef.current.srcObject) {
      (videoRef.current.srcObject as MediaStream)
        .getTracks()
        .forEach((track) => track.stop());
    }
  };

  const resetFlow = () => {
    setValidationResult(null);
    setError("");
    setModalOpen(true);
  };

  const renderContent = () => {
    if (validationResult) {
      switch (validationResult.status) {
        case 'approved':
          return (
            <div className="flex flex-col items-center text-center gap-4">
              <UserCheck className="h-20 w-20 text-green-500" />
              <h2 className="text-2xl font-bold text-green-500">{validationResult.message}</h2>
              <p className="text-lg"><span className="font-semibold">Tipo:</span> {validationResult.tipo}</p>
              <p className="text-lg"><span className="font-semibold">Empleado:</span> {validationResult.empleado?.nombre}</p>
              <Button onClick={() => {
                const basePath = ((window as any).__NEXT_DATA__?.basePath || process.env.NEXT_PUBLIC_BASE_PATH || '').replace(/\/+$/, '');
                window.location.href = basePath ? `${basePath}/` : '/';
              }} className="mt-4">Nuevo Registro</Button>
            </div>
          );
        case 'update_required':
           return (
            <div className="flex flex-col items-center text-center gap-4">
              <RefreshCw className="h-20 w-20 text-yellow-500" />
              <h2 className="text-2xl font-bold text-yellow-500">Actualización Requerida</h2>
              <p className="text-muted-foreground">{validationResult.message}</p>
              <p>Por favor, tome una nueva foto para actualizar su perfil.</p>
              <Button onClick={resetFlow} className="mt-4">Tomar Nueva Foto</Button>
            </div>
          );
        case 'denied':
        default:
          return (
            <div className="flex flex-col items-center text-center gap-4">
              <UserX className="h-20 w-20 text-destructive" />
              <h2 className="text-2xl font-bold text-destructive">Acceso Denegado</h2>
              <p className="text-muted-foreground">{validationResult.error || validationResult.message || 'No se pudo verificar su identidad.'}</p>
              <Button onClick={resetFlow} className="mt-4">Reintentar</Button>
            </div>
          );
      }
    }

    if (error) {
      return (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Error de Cámara</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      );
    }

    return null;
  };

  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4">
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/10 via-background to-accent/10"></div>
      <Card className="w-full max-w-lg rounded-2xl border-border/20 bg-card/80 shadow-2xl backdrop-blur-sm">
        <CardHeader className="text-center">
          <CardTitle className="font-headline text-3xl tracking-tight text-primary">
            Verificación Facial
          </CardTitle>
          <CardDescription className="text-lg text-muted-foreground">
            Bienvenido, {nombre || 'Usuario'}. Centre su rostro en la cámara.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          {renderContent() || (
            /* Modal flotante para la cámara - USANDO EL PATRÓN EXACTO QUE FUNCIONA */
            modalOpen && (
              <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
                {loading ? (
                  <div
                    className="bg-white rounded-lg shadow-lg flex flex-col items-center justify-center relative"
                    style={{
                      width: "55vw",
                      height: "55vh",
                      maxWidth: "95vw",
                      maxHeight: "95vh",
                      minWidth: "300px",
                      minHeight: "300px",
                      overflow: "hidden",
                    }}
                  >
                    <div className="flex flex-col items-center justify-center h-full w-full">
                      <div className="relative flex items-center justify-center mb-4">
                        <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center">
                          <Camera className="w-10 h-10 text-white" />
                        </div>
                        <span className="absolute inset-0 flex items-center justify-center">
                          <span className="animate-spin rounded-full border-4 border-blue-400 border-t-transparent w-24 h-24"></span>
                        </span>
                      </div>
                      <span className="text-lg font-semibold text-blue-700">
                        Verificando identidad...
                      </span>
                    </div>
                  </div>
                ) : (
                  <div
                    className="bg-white rounded-lg shadow-lg flex flex-col items-center justify-center relative"
                    style={{
                      width: "55vw",
                      height: "55vh",
                      maxWidth: "95vw",
                      maxHeight: "95vh",
                      minWidth: "300px",
                      minHeight: "300px",
                      overflow: "hidden",
                    }}
                  >
                    {/* Elemento video principal */}
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      className="absolute top-0 left-0 w-full h-full object-cover rounded"
                      style={{
                        zIndex: 1,
                        // Espejo solo para cámara frontal. Trasera se ve
                        // "natural" para que el movimiento del usuario
                        // coincida con el de la imagen.
                        transform: isFrontCamera ? "scaleX(-1)" : "none",
                      }}
                    />
                    
                    {/* Botón cancelar en esquina superior derecha */}
                    <div
                      className="absolute top-4 right-4 flex items-center justify-center"
                      style={{ zIndex: 10 }}
                    >
                      <div
                        className="w-12 h-12 flex items-center justify-center rounded-full"
                        style={{
                          background: "rgba(255,255,255,0.6)",
                          backdropFilter: "blur(6px)",
                          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                          cursor: "pointer",
                        }}
                        onClick={handleCloseModal}
                      >
                        <XIcon size={28} color="#333" />
                      </div>
                    </div>
                    
                    {/* Círculo guía con animación de progreso */}
                    <div
                      className="absolute pointer-events-none"
                      style={{
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        width: "290px",
                        height: "290px",
                        zIndex: 3,
                      }}
                    >
                      <svg width="290" height="290" viewBox="0 0 290 290">
                        <circle
                          cx="145"
                          cy="145"
                          r="135"
                          stroke="#fff"
                          strokeWidth="8"
                          fill="none"
                          opacity="0.8"
                        />
                        <circle
                          cx="145"
                          cy="145"
                          r="135"
                          stroke={progressColor}
                          strokeWidth="10"
                          fill="none"
                          strokeDasharray={2 * Math.PI * 135}
                          strokeDashoffset={
                            2 * Math.PI * 135 * (1 - progress / 100)
                          }
                          style={{
                            transition: "stroke-dashoffset 1s linear",
                            filter: `drop-shadow(0 0 8px ${progressColor})`,
                          }}
                        />
                      </svg>
                    </div>
                    
                    {/* Contador regresivo */}
                    {videoReady && (
                      <div
                        className="absolute left-1/2"
                        style={{
                          bottom: typeof window !== "undefined" && window.innerWidth < 768 ? "18px" : "calc(50% + 150px)",
                          transform: "translateX(-50%)",
                          zIndex: 4,
                        }}
                      >
                        <span
                          className="text-3xl font-extrabold px-6 py-2 rounded-full shadow"
                          style={{
                            background: "rgba(0, 85, 184, 0.85)",
                            color: "#fff",
                            letterSpacing: "1px",
                            textShadow: "0 1px 4px rgba(0,0,0,0.18)",
                          }}
                        >
                          {counter > 0 ? `${counter}s` : "¡Listo!"}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          )}
        </CardContent>
      </Card>
    </main>
  );
}
