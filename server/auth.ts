import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import { getPhysicianByEmpId, getNurseByEmpId } from "./db";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "hospital-chat-secret-key",
    resave: false,
    saveUninitialized: true, // Allow sessions to be saved for guest users
    store: storage.sessionStore,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      httpOnly: true,
      secure: false, // Set to false for development
      sameSite: 'lax', // Allow cross-site requests
    },
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        console.log(`Login attempt with username: ${username}`);
        
        // First check in our own users table
        const user = await storage.getUserByUsername(username);
        console.log("User from storage:", user ? `Found: ${user.username}` : "Not found");
        
        if (user && await comparePasswords(password, user.password)) {
          console.log("User authenticated from storage");
          return done(null, user);
        }
        
        // If not found in users table, check empId in MongoDB
        // This would be a simplified implementation for demo purposes
        // In production, we'd need proper auth against the actual MongoDB
        console.log("Checking for physician with empId:", username);
        const physician = await getPhysicianByEmpId(username);
        console.log("Physician:", physician ? `Found: ${physician.name}` : "Not found");
        
        if (physician) {
          // Mock password check - in real world we'd check actual password
          if (password === "password") {
            console.log("Creating new user from physician");
            const newUser = await storage.createUser({
              username: username,
              password: await hashPassword(password),
              name: physician.name || "Unknown Physician",
              role: "physician",
              empId: physician.empId,
              specialty: physician.speciality || "",
              profileImage: "https://randomuser.me/api/portraits/men/44.jpg"
            });
            console.log("New user created:", newUser);
            return done(null, newUser);
          } else {
            console.log("Physician found but password incorrect");
          }
        }
        
        console.log("Checking for nurse with empId:", username);
        const nurse = await getNurseByEmpId(username);
        console.log("Nurse:", nurse ? `Found: ${nurse.name}` : "Not found");
        
        if (nurse) {
          // Mock password check - in real world we'd check actual password
          if (password === "password") {
            console.log("Creating new user from nurse");
            const newUser = await storage.createUser({
              username: username,
              password: await hashPassword(password),
              name: nurse.name || "Unknown Nurse",
              role: "nurse",
              empId: nurse.empId,
              specialty: nurse.nurseType || "",
              profileImage: "https://randomuser.me/api/portraits/women/44.jpg"
            });
            console.log("New user created:", newUser);
            return done(null, newUser);
          } else {
            console.log("Nurse found but password incorrect");
          }
        }
        
        return done(null, false);
      } catch (error) {
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    const user = await storage.getUser(id);
    done(null, user);
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const user = await storage.createUser({
        ...req.body,
        password: await hashPassword(req.body.password),
      });

      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json(user);
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/login", passport.authenticate("local"), (req, res) => {
    res.status(200).json(req.user);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });
}
