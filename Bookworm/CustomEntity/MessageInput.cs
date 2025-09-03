using System;
using System.Collections.Generic;

namespace CustomEntity
{
	// Token: 0x0200000F RID: 15
	public class MessageInput
	{
		// Token: 0x17000050 RID: 80
		// (get) Token: 0x060000B6 RID: 182 RVA: 0x00002FF6 File Offset: 0x000011F6
		// (set) Token: 0x060000B7 RID: 183 RVA: 0x00002FFE File Offset: 0x000011FE
		public string Content { get; set; }

		// Token: 0x17000051 RID: 81
		// (get) Token: 0x060000B8 RID: 184 RVA: 0x00003007 File Offset: 0x00001207
		// (set) Token: 0x060000B9 RID: 185 RVA: 0x0000300F File Offset: 0x0000120F
		public string Link { get; set; }

		// Token: 0x17000052 RID: 82
		// (get) Token: 0x060000BA RID: 186 RVA: 0x00003018 File Offset: 0x00001218
		// (set) Token: 0x060000BB RID: 187 RVA: 0x00003020 File Offset: 0x00001220
		public long EdataId { get; set; }

		// Token: 0x17000053 RID: 83
		// (get) Token: 0x060000BC RID: 188 RVA: 0x00003029 File Offset: 0x00001229
		// (set) Token: 0x060000BD RID: 189 RVA: 0x00003031 File Offset: 0x00001231
		public int PatronIDFrom { get; set; }

		// Token: 0x17000054 RID: 84
		// (get) Token: 0x060000BE RID: 190 RVA: 0x0000303A File Offset: 0x0000123A
		// (set) Token: 0x060000BF RID: 191 RVA: 0x00003042 File Offset: 0x00001242
		public int PGroupIDTo { get; set; }

		// Token: 0x17000055 RID: 85
		// (get) Token: 0x060000C0 RID: 192 RVA: 0x0000304B File Offset: 0x0000124B
		// (set) Token: 0x060000C1 RID: 193 RVA: 0x00003053 File Offset: 0x00001253
		public string Type { get; set; }

		// Token: 0x17000056 RID: 86
		// (get) Token: 0x060000C2 RID: 194 RVA: 0x0000305C File Offset: 0x0000125C
		// (set) Token: 0x060000C3 RID: 195 RVA: 0x00003064 File Offset: 0x00001264
		public List<int> listPatronIDTo { get; set; }

		// Token: 0x17000057 RID: 87
		// (get) Token: 0x060000C4 RID: 196 RVA: 0x0000306D File Offset: 0x0000126D
		// (set) Token: 0x060000C5 RID: 197 RVA: 0x00003075 File Offset: 0x00001275
		public string EdataName { get; set; }

		// Token: 0x17000058 RID: 88
		// (get) Token: 0x060000C6 RID: 198 RVA: 0x0000307E File Offset: 0x0000127E
		// (set) Token: 0x060000C7 RID: 199 RVA: 0x00003086 File Offset: 0x00001286
		public string EdataCoverPic { get; set; }
	}
}
