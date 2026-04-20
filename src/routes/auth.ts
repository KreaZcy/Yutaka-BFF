import express from "express";
import { serviceFetch } from "../clients/base.js";
import { config } from "../config.js";

const router = express.Router();

const authUrl = (path: string) => `${config.REKOGNIZCY_URL}/api/v1/auth${path}`;

router.post("/login", async (req, res, next) => {
  try {
    const { data, status } = await serviceFetch(authUrl("/login"), {
      method: "POST",
      body: JSON.stringify(req.body),
    });
    res.status(status).json(data);
  } catch (err) { next(err); }
});

router.post("/register", async (req, res, next) => {
  try {
    const { data, status } = await serviceFetch(authUrl("/register"), {
      method: "POST",
      body: JSON.stringify(req.body),
    });
    res.status(status).json(data);
  } catch (err) { next(err); }
});

router.get("/me", async (req, res, next) => {
  try {
    const { data } = await serviceFetch(authUrl("/me"), {
      headers: { Authorization: req.headers.authorization || "" },
    });
    res.json(data);
  } catch (err) { next(err); }
});

router.post("/refresh", async (req, res, next) => {
  try {
    const { data, status } = await serviceFetch(authUrl("/refresh"), {
      method: "POST",
      body: JSON.stringify(req.body),
    });
    res.status(status).json(data);
  } catch (err) { next(err); }
});

router.post("/logout", async (req, res, next) => {
  try {
    const { data, status } = await serviceFetch(authUrl("/logout"), {
      method: "POST",
      headers: { Authorization: req.headers.authorization || "" },
    });
    res.status(status).json(data);
  } catch (err) { next(err); }
});

router.post("/magic/verify", async (req, res, next) => {
  try {
    const { data, status } = await serviceFetch(authUrl("/magic/verify"), {
      method: "POST",
      body: JSON.stringify(req.body),
    });
    res.status(status).json(data);
  } catch (err) { next(err); }
});

export { router };
