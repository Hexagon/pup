import { createJWT, generateKey } from "@cross/jwt"

// Dummy secret
const jwtSecret = "GawoWOOWOOFSAFFASOFOFOASOAOFASFwoopieeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"

const key = await generateKey(jwtSecret, "HS512")

const payload = {
  user: {
    name: "Test",
  },
  exp: Date.now() + 60 * 60 * 1000,
}

console.log(await createJWT(payload, key))
