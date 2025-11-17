import fs from 'fs';
import path from 'path';
import { ChainData } from '@/types/chain';
export function getAllChains(): ChainData[] {
  const chainsDirectory = path.join(process.cwd(), 'Chains');
  const filenames = fs.readdirSync(chainsDirectory);
  const chains = filenames
    .filter(filename => filename.endsWith('.json'))
    .map(filename => {
      const filePath = path.join(chainsDirectory, filename);
      const fileContents = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(fileContents) as ChainData;
    });
  return chains;
}
export function getChainByName(chainName: string): ChainData | null {
  const chains = getAllChains();
  return chains.find(chain => 
    chain.chain_name.toLowerCase() === chainName.toLowerCase()
  ) || null;
}
export function getChainNames(): string[] {
  const chains = getAllChains();
  return chains.map(chain => chain.chain_name);
}
