import { useLocation } from "wouter";
import { useEffect } from "react";

// Register flow is handled on the login page via the toggle
export default function Register() {
  const [, navigate] = useLocation();
  useEffect(() => { navigate("/login"); }, []);
  return null;
}
