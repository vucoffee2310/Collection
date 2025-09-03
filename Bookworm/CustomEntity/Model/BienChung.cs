using System;

namespace CustomEntity.Model
{
	// Token: 0x02000010 RID: 16
	public class BienChung
	{
		// Token: 0x17000059 RID: 89
		// (get) Token: 0x060000C9 RID: 201 RVA: 0x00003097 File Offset: 0x00001297
		public static BienChung Instance
		{
			get
			{
				if (BienChung.instance == null)
				{
					BienChung.instance = new BienChung();
				}
				return BienChung.instance;
			}
		}

		// Token: 0x1700005A RID: 90
		// (get) Token: 0x060000CA RID: 202 RVA: 0x000030AF File Offset: 0x000012AF
		// (set) Token: 0x060000CB RID: 203 RVA: 0x000030B7 File Offset: 0x000012B7
		public long DataID { get; set; }

		// Token: 0x1700005B RID: 91
		// (get) Token: 0x060000CC RID: 204 RVA: 0x000030C0 File Offset: 0x000012C0
		// (set) Token: 0x060000CD RID: 205 RVA: 0x000030C8 File Offset: 0x000012C8
		public Book Book { get; set; }

		// Token: 0x1700005C RID: 92
		// (get) Token: 0x060000CE RID: 206 RVA: 0x000030D1 File Offset: 0x000012D1
		// (set) Token: 0x060000CF RID: 207 RVA: 0x000030D9 File Offset: 0x000012D9
		public string outFolder { get; set; } = "";

		// Token: 0x1700005D RID: 93
		// (get) Token: 0x060000D0 RID: 208 RVA: 0x000030E2 File Offset: 0x000012E2
		// (set) Token: 0x060000D1 RID: 209 RVA: 0x000030EA File Offset: 0x000012EA
		public ThoiGianDoc thoiGianDoc { get; set; }

		// Token: 0x1700005E RID: 94
		// (get) Token: 0x060000D2 RID: 210 RVA: 0x000030F3 File Offset: 0x000012F3
		// (set) Token: 0x060000D3 RID: 211 RVA: 0x000030FB File Offset: 0x000012FB
		public Account user { get; set; }

		// Token: 0x1700005F RID: 95
		// (get) Token: 0x060000D4 RID: 212 RVA: 0x00003104 File Offset: 0x00001304
		// (set) Token: 0x060000D5 RID: 213 RVA: 0x0000310C File Offset: 0x0000130C
		public BookRead BookRead { get; set; }

		// Token: 0x17000060 RID: 96
		// (get) Token: 0x060000D6 RID: 214 RVA: 0x00003115 File Offset: 0x00001315
		// (set) Token: 0x060000D7 RID: 215 RVA: 0x0000311D File Offset: 0x0000131D
		public ProductPdf BookReadProduct { get; set; }

		// Token: 0x0400005A RID: 90
		private static BienChung instance;
	}
}
