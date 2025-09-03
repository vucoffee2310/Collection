using System;
using Dapper.Contrib.Extensions;

namespace CustomEntity
{
	// Token: 0x0200000A RID: 10
	[Table("Books")]
	public class BookSql
	{
		// Token: 0x17000032 RID: 50
		// (get) Token: 0x06000075 RID: 117 RVA: 0x00002DD0 File Offset: 0x00000FD0
		// (set) Token: 0x06000076 RID: 118 RVA: 0x00002DD8 File Offset: 0x00000FD8
		public long BookId { get; set; }

		// Token: 0x17000033 RID: 51
		// (get) Token: 0x06000077 RID: 119 RVA: 0x00002DE1 File Offset: 0x00000FE1
		// (set) Token: 0x06000078 RID: 120 RVA: 0x00002DE9 File Offset: 0x00000FE9
		public string BookName { get; set; }

		// Token: 0x17000034 RID: 52
		// (get) Token: 0x06000079 RID: 121 RVA: 0x00002DF2 File Offset: 0x00000FF2
		// (set) Token: 0x0600007A RID: 122 RVA: 0x00002DFA File Offset: 0x00000FFA
		public int Dadoc { get; set; }

		// Token: 0x17000035 RID: 53
		// (get) Token: 0x0600007B RID: 123 RVA: 0x00002E03 File Offset: 0x00001003
		// (set) Token: 0x0600007C RID: 124 RVA: 0x00002E0B File Offset: 0x0000100B
		public string BookCode { get; set; }

		// Token: 0x17000036 RID: 54
		// (get) Token: 0x0600007D RID: 125 RVA: 0x00002E14 File Offset: 0x00001014
		// (set) Token: 0x0600007E RID: 126 RVA: 0x00002E1C File Offset: 0x0000101C
		public string BookCover { get; set; }

		// Token: 0x17000037 RID: 55
		// (get) Token: 0x0600007F RID: 127 RVA: 0x00002E25 File Offset: 0x00001025
		// (set) Token: 0x06000080 RID: 128 RVA: 0x00002E2D File Offset: 0x0000102D
		public string Author { get; set; }

		// Token: 0x17000038 RID: 56
		// (get) Token: 0x06000081 RID: 129 RVA: 0x00002E36 File Offset: 0x00001036
		// (set) Token: 0x06000082 RID: 130 RVA: 0x00002E3E File Offset: 0x0000103E
		public string NhaXuatBan { get; set; }

		// Token: 0x17000039 RID: 57
		// (get) Token: 0x06000083 RID: 131 RVA: 0x00002E47 File Offset: 0x00001047
		// (set) Token: 0x06000084 RID: 132 RVA: 0x00002E4F File Offset: 0x0000104F
		public string NamXuatBan { get; set; }

		// Token: 0x1700003A RID: 58
		// (get) Token: 0x06000085 RID: 133 RVA: 0x00002E58 File Offset: 0x00001058
		// (set) Token: 0x06000086 RID: 134 RVA: 0x00002E60 File Offset: 0x00001060
		public long LibraryId { get; set; }

		// Token: 0x1700003B RID: 59
		// (get) Token: 0x06000087 RID: 135 RVA: 0x00002E69 File Offset: 0x00001069
		// (set) Token: 0x06000088 RID: 136 RVA: 0x00002E71 File Offset: 0x00001071
		public string LibraryDomain { get; set; }

		// Token: 0x1700003C RID: 60
		// (get) Token: 0x06000089 RID: 137 RVA: 0x00002E7A File Offset: 0x0000107A
		// (set) Token: 0x0600008A RID: 138 RVA: 0x00002E82 File Offset: 0x00001082
		public string LibraryName { get; set; }

		// Token: 0x1700003D RID: 61
		// (get) Token: 0x0600008B RID: 139 RVA: 0x00002E8B File Offset: 0x0000108B
		// (set) Token: 0x0600008C RID: 140 RVA: 0x00002E93 File Offset: 0x00001093
		public string UserName { get; set; }

		// Token: 0x1700003E RID: 62
		// (get) Token: 0x0600008D RID: 141 RVA: 0x00002E9C File Offset: 0x0000109C
		// (set) Token: 0x0600008E RID: 142 RVA: 0x00002EA4 File Offset: 0x000010A4
		public long DonViID { get; set; }

		// Token: 0x1700003F RID: 63
		// (get) Token: 0x0600008F RID: 143 RVA: 0x00002EAD File Offset: 0x000010AD
		// (set) Token: 0x06000090 RID: 144 RVA: 0x00002EB5 File Offset: 0x000010B5
		public bool DaThietLapThoiGian { get; set; }

		// Token: 0x17000040 RID: 64
		// (get) Token: 0x06000091 RID: 145 RVA: 0x00002EBE File Offset: 0x000010BE
		// (set) Token: 0x06000092 RID: 146 RVA: 0x00002EC6 File Offset: 0x000010C6
		public double RemainDate { get; set; }

		// Token: 0x17000041 RID: 65
		// (get) Token: 0x06000093 RID: 147 RVA: 0x00002ECF File Offset: 0x000010CF
		// (set) Token: 0x06000094 RID: 148 RVA: 0x00002ED7 File Offset: 0x000010D7
		public bool IsReading { get; set; }

		// Token: 0x17000042 RID: 66
		// (get) Token: 0x06000095 RID: 149 RVA: 0x00002EE0 File Offset: 0x000010E0
		// (set) Token: 0x06000096 RID: 150 RVA: 0x00002EE8 File Offset: 0x000010E8
		public string UserPassword { get; set; }

		// Token: 0x17000043 RID: 67
		// (get) Token: 0x06000097 RID: 151 RVA: 0x00002EF1 File Offset: 0x000010F1
		// (set) Token: 0x06000098 RID: 152 RVA: 0x00002EF9 File Offset: 0x000010F9
		public bool IsDownload { get; set; }

		// Token: 0x17000044 RID: 68
		// (get) Token: 0x06000099 RID: 153 RVA: 0x00002F02 File Offset: 0x00001102
		// (set) Token: 0x0600009A RID: 154 RVA: 0x00002F0A File Offset: 0x0000110A
		public DateTime GetDataDate { get; set; }
	}
}
