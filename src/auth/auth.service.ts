import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";

@Injectable()
export class AuthService {
  constructor(private jwtService: JwtService) {}
  
  generateToken(user_id: String, user_role: String) {
    const payload = { id: user_id, role: user_role };
    return this.jwtService.sign(payload);
  }
  

  async verifyToken(token: String) {
    try {
      if (!token) {
        throw new UnauthorizedException("Invalid token format");
      }
      const sanitizedToken = token.split(" ")[1];
      if (!sanitizedToken) {
        throw new UnauthorizedException("Invalid token format");
      }
      const decoded = await this.jwtService.verifyAsync(sanitizedToken);
      if (!decoded) {
        throw new UnauthorizedException("Unauthorize Error");
      }
      return decoded;
    } catch (error) {
      throw new UnauthorizedException("Invalid or expired token");
    }
  }
}
