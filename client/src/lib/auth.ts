import { apiRequest } from "./queryClient";
import { User } from "./types";

export async function login(username: string, password: string): Promise<User> {
  const response = await apiRequest("POST", "/api/login", { username, password });
  return response.json();
}

export async function register(
  username: string, 
  password: string, 
  companyName: string, 
  role: "admin" | "forwarder"
): Promise<User> {
  const response = await apiRequest("POST", "/api/register", { 
    username, 
    password, 
    companyName, 
    role 
  });
  return response.json();
}

export async function logout(): Promise<void> {
  await apiRequest("POST", "/api/logout");
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const response = await fetch("/api/me", {
      credentials: "include"
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        return null;
      }
      throw new Error(`Error fetching current user: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("Error fetching current user:", error);
    return null;
  }
}
