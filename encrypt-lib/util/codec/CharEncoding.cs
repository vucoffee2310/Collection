using System;
using System.Runtime.CompilerServices;
using IKVM.Attributes;
using java.lang;

namespace com.edc.classbook.util.codec
{
	// Token: 0x0200000B RID: 11
	public class CharEncoding : Object
	{
		// Token: 0x06000092 RID: 146 RVA: 0x00002BD8 File Offset: 0x00000DD8
		[LineNumberTable(58)]
		[MethodImpl(8)]
		public CharEncoding()
		{
		}

		// Token: 0x04000035 RID: 53
		public const string ISO_8859_1 = "ISO-8859-1";

		// Token: 0x04000036 RID: 54
		public const string US_ASCII = "US-ASCII";

		// Token: 0x04000037 RID: 55
		public const string UTF_16 = "UTF-16";

		// Token: 0x04000038 RID: 56
		public const string UTF_16BE = "UTF-16BE";

		// Token: 0x04000039 RID: 57
		public const string UTF_16LE = "UTF-16LE";

		// Token: 0x0400003A RID: 58
		public const string UTF_8 = "UTF-8";
	}
}
