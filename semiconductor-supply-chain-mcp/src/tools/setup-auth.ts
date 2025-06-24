import { z } from 'zod';
import { AuthManager, AuthConfig } from '../config/auth.js';
import * as readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';

const SetupAuthSchema = z.object({
  site: z.enum(['designreuse', 'anysilicon']).describe('Site to configure authentication for'),
});

export const setupAuthTool = {
  definition: {
    name: 'setup_auth',
    description: 'Configure authentication credentials for protected sites',
    inputSchema: SetupAuthSchema,
  },
  
  handler: async (args: unknown) => {
    const parsed = SetupAuthSchema.parse(args);
    const authManager = new AuthManager();
    
    // Load existing config
    await authManager.loadConfig();
    
    const rl = readline.createInterface({ input, output });
    
    try {
      let configUpdate: Partial<AuthConfig> = {};
      
      if (parsed.site === 'designreuse') {
        console.log('\nConfiguring DesignReuse authentication...');
        console.log('Note: Your credentials will be stored locally in ~/.semiconductor-mcp/auth.json');
        
        const username = await rl.question('DesignReuse username: ');
        const password = await rl.question('DesignReuse password: ');
        
        configUpdate.designreuse = {
          username,
          password,
        };
        
        console.log('\nCredentials configured. They will be used automatically when accessing DesignReuse.');
      }
      
      // Save updated config
      await authManager.loadConfig();
      const currentConfig = authManager.getCredentials('designreuse') || {};
      await authManager.saveConfig(configUpdate as AuthConfig);
      
      return {
        content: [
          {
            type: 'text',
            text: `Authentication configured successfully for ${parsed.site}.\n` +
                  `Credentials are stored in ~/.semiconductor-mcp/auth.json\n` +
                  `You can now use tools that require ${parsed.site} access.`,
          },
        ],
      };
      
    } finally {
      rl.close();
    }
  },
};