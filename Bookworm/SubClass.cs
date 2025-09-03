using System;

namespace Bookworm
{
	// Token: 0x02000017 RID: 23
	internal class SubClass
	{
		// Token: 0x17000070 RID: 112
		// (get) Token: 0x06000115 RID: 277 RVA: 0x00003FEC File Offset: 0x000021EC
		// (set) Token: 0x06000116 RID: 278 RVA: 0x00003FF4 File Offset: 0x000021F4
		public int Id { get; set; }

		// Token: 0x17000071 RID: 113
		// (get) Token: 0x06000117 RID: 279 RVA: 0x00003FFD File Offset: 0x000021FD
		// (set) Token: 0x06000118 RID: 280 RVA: 0x00004005 File Offset: 0x00002205
		public TimeSpan StartTime { get; set; }

		// Token: 0x17000072 RID: 114
		// (get) Token: 0x06000119 RID: 281 RVA: 0x0000400E File Offset: 0x0000220E
		// (set) Token: 0x0600011A RID: 282 RVA: 0x00004016 File Offset: 0x00002216
		public TimeSpan EndTime { get; set; }

		// Token: 0x17000073 RID: 115
		// (get) Token: 0x0600011B RID: 283 RVA: 0x0000401F File Offset: 0x0000221F
		// (set) Token: 0x0600011C RID: 284 RVA: 0x00004027 File Offset: 0x00002227
		public string Text { get; set; }
	}
}
