using System;
using System.Runtime.CompilerServices;
using IKVM.Attributes;
using java.io;

namespace com.edc.classbook.util.codec.binary
{
	// Token: 0x02000016 RID: 22
	public class Base32OutputStream : BaseNCodecOutputStream
	{
		// Token: 0x060000BD RID: 189 RVA: 0x00004984 File Offset: 0x00002B84
		[LineNumberTable(new byte[] { 159, 127, 98, 112 })]
		[MethodImpl(8)]
		public Base32OutputStream(OutputStream @out, bool doEncode)
			: base(@out, new Base32(false), doEncode)
		{
		}

		// Token: 0x060000BE RID: 190 RVA: 0x000049A3 File Offset: 0x00002BA3
		[LineNumberTable(new byte[] { 159, 190, 106 })]
		[MethodImpl(8)]
		public Base32OutputStream(OutputStream @out)
			: this(@out, true)
		{
		}

		// Token: 0x060000BF RID: 191 RVA: 0x000049B0 File Offset: 0x00002BB0
		[LineNumberTable(new byte[] { 159, 122, 98, 114 })]
		[MethodImpl(8)]
		public Base32OutputStream(OutputStream @out, bool doEncode, int lineLength, byte[] lineSeparator)
			: base(@out, new Base32(lineLength, lineSeparator), doEncode)
		{
		}
	}
}
