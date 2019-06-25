# cas-app-proxy

cas-app-proxy is a nodejs application which provides a CAS authentication layer in front of any web app.

# Example - Run a Sid Desktop with CAS authentication
Requires Docker installation.

```
npm install
docker run -d -p 8080:8080 hmdc/sid-desktop
```

Replace xyz123 with your Harvard Key or CAS id.

This will redirect you to Harvard Key, which will attempt to redirect you to ```aws.development.sid.hmdc.harvard.edu```. You will need to set ```aws.development.sid.hmdc.harvard.edu``` to 127.0.0.1 in ```/etc/hosts``` to validate that CAS and cas-app-proxy works outside of Kubernetes.


```sudo env JOB_ID=abc PROXYING_MODE=xpra CAS_VALID_USER=xyz123 CAS_SERVICE_URL="https://aws.development.sid.hmdc.harvard.edu/abc/authenticate" CAS_SERVER_BASE_URL="https://aws.development.sid.hmdc.harvard.edu/abc" node bin/www```

Visit https://localhost/abc in your browser and you should be proxied to a desktop
after authentication

# Example - Run without CAS authentication
If you don't need CAS authentication for local testing, you can set the environment variable
```
SKIP_AUTHENTICATION=yes
```
before running the above commands. You can then visit https://localhost/abc without
redirecting to Harvard Key.
# Proxying modes
* xpra - use this when proxying to XPRA powered containers. This mode sets following query-string arguments on XPRA HTML5 client URI - remove top bar and set websocket path to ```${JOB_ID}``` as defined in environment variable.
* rstudio - uppercases headers while proxying, required for RStudio.qq
* empty - uses no special proxying modes. jupyter does not require one.