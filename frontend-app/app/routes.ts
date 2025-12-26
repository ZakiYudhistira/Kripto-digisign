import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
    index("routes/home.tsx"),
    route("register", "pages/register.tsx"),
    route("sign", "pages/sign.tsx"),
    route("verify", "pages/verify.tsx"),
] satisfies RouteConfig;
