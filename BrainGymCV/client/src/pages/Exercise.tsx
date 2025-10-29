import { useEffect, useRef, useState, useCallback } from "react";
import { useRoute, useLocation } from "wouter";
import { EXERCISES, type ExerciseType } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Camera, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { ExerciseValidationResponse } from "@shared/schema";
import { getExerciseIcon } from "@/lib/icons";

export default function Exercise() {
  const [, params] = useRoute("/exercise/:exerciseId");
  const [, setLocation] = useLocation();
  const exerciseId = params?.exerciseId as ExerciseType;
  const exercise = EXERCISES[exerciseId];

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [lastValidation, setLastValidation] = useState<ExerciseValidationResponse | null>(null);
  const [totalPoints, setTotalPoints] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const username = localStorage.getItem("brainGymUsername") || "";

  // Redirect to home if no username is set
  useEffect(() => {
    if (!username) {
      setLocation("/");
    }
  }, [username, setLocation]);

  useEffect(() => {
    if (!exercise) {
      setLocation("/");
      return;
    }

    const startCamera = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: 1280, height: 720 },
          audio: false,
        });
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (error) {
        console.error("Error accessing camera:", error);
      }
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [exercise, setLocation]);

  const validateMutation = useMutation({
    mutationFn: async (imageData: string) => {
      const response = await apiRequest<ExerciseValidationResponse>(
        "POST",
        "/api/exercises/validate",
        {
          exerciseType: exerciseId,
          imageData,
          username,
        }
      );
      return response;
    },
    onSuccess: (data) => {
      setLastValidation(data);
      if (data.isCorrect) {
        setTotalPoints((prev) => prev + data.pointsEarned);
      }
    },
  });

  const captureFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || validateMutation.isPending) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    if (!context || video.readyState !== video.HAVE_ENOUGH_DATA) {
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = canvas.toDataURL("image/jpeg", 0.8).split(",")[1];
    validateMutation.mutate(imageData);
  }, [exerciseId, username, validateMutation]);

  const handleStartCapture = () => {
    setIsCapturing(true);
  };

  const handleStopCapture = () => {
    setIsCapturing(false);
    setLastValidation(null);
  };

  const handleFinishExercise = () => {
    if (totalPoints > 0) {
      setLocation(`/results/${exerciseId}/${totalPoints}`);
    } else {
      setLocation("/");
    }
  };

  useEffect(() => {
    if (!isCapturing) return;

    const interval = setInterval(() => {
      captureFrame();
    }, 3000);

    return () => clearInterval(interval);
  }, [isCapturing, captureFrame]);

  if (!exercise) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => setLocation("/")}
              className="gap-2"
              data-testid="button-back"
            >
              <ArrowLeft className="h-5 w-5" />
              Back to Exercises
            </Button>
            <div className="flex items-center gap-4">
              <Badge variant="secondary" className="text-lg px-4 py-2">
                <span className="text-muted-foreground">Points:</span>
                <span className="ml-2 font-bold text-foreground" data-testid="text-total-points">
                  {totalPoints}
                </span>
              </Badge>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 max-w-7xl mx-auto">
          <div className="lg:col-span-3 space-y-6">
            <div className="relative rounded-2xl overflow-hidden bg-muted aspect-video">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                data-testid="video-camera"
              />
              {!stream && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted">
                  <div className="text-center space-y-4">
                    <Camera className="h-16 w-16 mx-auto text-muted-foreground" />
                    <p className="text-lg text-muted-foreground">Starting camera...</p>
                  </div>
                </div>
              )}
              {validateMutation.isPending && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm">
                  <div className="bg-card rounded-2xl p-6 shadow-xl">
                    <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
                    <p className="mt-4 text-lg font-semibold text-foreground">Checking your form...</p>
                  </div>
                </div>
              )}
            </div>

            <canvas ref={canvasRef} className="hidden" />

            <div className="flex justify-center gap-4">
              {!isCapturing ? (
                <>
                  <Button
                    size="lg"
                    onClick={handleStartCapture}
                    disabled={!stream}
                    className="text-lg px-8 gap-2"
                    data-testid="button-start-exercise"
                  >
                    <Camera className="h-5 w-5" />
                    Start Exercise
                  </Button>
                  {totalPoints > 0 && (
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={handleFinishExercise}
                      className="text-lg px-8"
                      data-testid="button-finish-exercise"
                    >
                      Finish Exercise
                    </Button>
                  )}
                </>
              ) : (
                <Button
                  size="lg"
                  variant="destructive"
                  onClick={handleStopCapture}
                  className="text-lg px-8"
                  data-testid="button-stop-exercise"
                >
                  Stop Exercise
                </Button>
              )}
            </div>

            {lastValidation && (
              <Card className={`p-6 ${lastValidation.isCorrect ? 'border-primary bg-primary/5' : 'border-muted'}`}>
                <div className="flex items-start gap-4">
                  {lastValidation.isCorrect ? (
                    <CheckCircle2 className="h-8 w-8 text-primary flex-shrink-0 mt-1" />
                  ) : (
                    <AlertCircle className="h-8 w-8 text-muted-foreground flex-shrink-0 mt-1" />
                  )}
                  <div className="flex-1 space-y-2">
                    <h3 className="text-xl font-bold text-foreground">
                      {lastValidation.encouragement}
                    </h3>
                    <p className="text-base text-muted-foreground leading-relaxed">
                      {lastValidation.feedback}
                    </p>
                    {lastValidation.isCorrect && (
                      <div className="flex items-center gap-2 pt-2">
                        <Badge variant="default" className="text-base px-3 py-1">
                          +{lastValidation.pointsEarned} points!
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            )}
          </div>

          <div className="lg:col-span-2 space-y-6">
            <Card className="p-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    {(() => {
                      const IconComponent = getExerciseIcon(exercise.icon);
                      return <IconComponent className="h-7 w-7 text-primary" />;
                    })()}
                  </div>
                  <h2 className="text-3xl font-bold text-foreground">{exercise.name}</h2>
                </div>
                <p className="text-base text-muted-foreground leading-relaxed">
                  {exercise.benefits}
                </p>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-xl font-bold text-foreground mb-4">How to do it:</h3>
              <ol className="space-y-3">
                {exercise.instructions.map((instruction, index) => (
                  <li key={index} className="flex gap-3">
                    <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                      {index + 1}
                    </span>
                    <span className="text-base text-foreground leading-relaxed pt-0.5">
                      {instruction}
                    </span>
                  </li>
                ))}
              </ol>
            </Card>

            <Card className="p-6 bg-accent/10 border-accent/20">
              <h3 className="text-lg font-bold text-foreground mb-3">💡 Tip</h3>
              <p className="text-base text-muted-foreground leading-relaxed">
                Make sure you're in a well-lit area and the camera can see your whole body.
                The AI will check your form every few seconds!
              </p>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
