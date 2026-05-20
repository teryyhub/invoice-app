export default function UserNotRegisteredError() {
  return (
    <div className="flex flex-col items-center justify-center h-screen gap-4">
      <h1 className="text-2xl font-bold">Account Not Registered</h1>
      <p className="text-muted-foreground">Your account isn't fully set up yet. Please contact support.</p>
    </div>
  );
}
