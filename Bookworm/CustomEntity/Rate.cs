using System;

namespace CustomEntity
{
	// Token: 0x0200000E RID: 14
	public class Rate
	{
		// Token: 0x1700004C RID: 76
		// (get) Token: 0x060000AD RID: 173 RVA: 0x00002FAA File Offset: 0x000011AA
		// (set) Token: 0x060000AE RID: 174 RVA: 0x00002FB2 File Offset: 0x000011B2
		public string PatronCode { get; set; }

		// Token: 0x1700004D RID: 77
		// (get) Token: 0x060000AF RID: 175 RVA: 0x00002FBB File Offset: 0x000011BB
		// (set) Token: 0x060000B0 RID: 176 RVA: 0x00002FC3 File Offset: 0x000011C3
		public long RefID { get; set; }

		// Token: 0x1700004E RID: 78
		// (get) Token: 0x060000B1 RID: 177 RVA: 0x00002FCC File Offset: 0x000011CC
		// (set) Token: 0x060000B2 RID: 178 RVA: 0x00002FD4 File Offset: 0x000011D4
		public int RateStar { get; set; }

		// Token: 0x1700004F RID: 79
		// (get) Token: 0x060000B3 RID: 179 RVA: 0x00002FDD File Offset: 0x000011DD
		// (set) Token: 0x060000B4 RID: 180 RVA: 0x00002FE5 File Offset: 0x000011E5
		public string Type { get; set; }
	}
}
