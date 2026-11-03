import {z} from 'zod';
export const agentMediaSchema=z.array(z.discriminatedUnion('kind',[
 z.object({kind:z.literal('image'),name:z.string().max(250),dataUrl:z.string().max(360000).regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/)}).strict(),
 z.object({kind:z.literal('text'),name:z.string().max(250),text:z.string().max(30000)}).strict(),
 z.object({kind:z.literal('unsupported'),name:z.string().max(250),mediaType:z.enum(['video','audio'])}).strict(),
])).max(10).refine(items=>items.filter(i=>i.kind==='image').length<=6&&items.filter(i=>i.kind==='text').reduce((n,i)=>n+i.text.length,0)<=30000,'Attachment budget exceeded');
export type AgentMedia=z.infer<typeof agentMediaSchema>;
