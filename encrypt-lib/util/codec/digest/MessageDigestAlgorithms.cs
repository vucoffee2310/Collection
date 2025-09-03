using System;
using System.Runtime.CompilerServices;
using IKVM.Attributes;
using java.lang;

namespace com.edc.classbook.util.codec.digest
{
	// Token: 0x02000025 RID: 37
	public class MessageDigestAlgorithms : Object
	{
		// Token: 0x06000188 RID: 392 RVA: 0x00006BF7 File Offset: 0x00004DF7
		[LineNumberTable(new byte[] { 159, 175, 136 })]
		[MethodImpl(8)]
		private MessageDigestAlgorithms()
		{
		}

		// Token: 0x04000091 RID: 145
		public const string MD2 = "MD2";

		// Token: 0x04000092 RID: 146
		public const string MD5 = "MD5";

		// Token: 0x04000093 RID: 147
		public const string SHA_1 = "SHA-1";

		// Token: 0x04000094 RID: 148
		public const string SHA_256 = "SHA-256";

		// Token: 0x04000095 RID: 149
		public const string SHA_384 = "SHA-384";

		// Token: 0x04000096 RID: 150
		public const string SHA_512 = "SHA-512";
	}
}
