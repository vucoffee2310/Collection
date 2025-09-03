using System;
using System.Runtime.CompilerServices;
using IKVM.Attributes;
using java.io;
using java.lang;

namespace com.edc.classbook.util.codec.binary
{
	// Token: 0x0200001D RID: 29
	public class BaseNCodecOutputStream : FilterOutputStream
	{
		// Token: 0x06000108 RID: 264 RVA: 0x000047D8 File Offset: 0x000029D8
		[Throws(new string[] { "java.io.IOException" })]
		[LineNumberTable(new byte[]
		{
			35, 99, 107, 104, 107, 108, 107, 100, 104, 150,
			148, 137
		})]
		[MethodImpl(8)]
		public override void write(byte[] b, int offset, int len)
		{
			if (b == null)
			{
				Throwable.__<suppressFillInStackTrace>();
				throw new NullPointerException();
			}
			if (offset < 0 || len < 0)
			{
				Throwable.__<suppressFillInStackTrace>();
				throw new IndexOutOfBoundsException();
			}
			if (offset > b.Length || offset + len > b.Length)
			{
				Throwable.__<suppressFillInStackTrace>();
				throw new IndexOutOfBoundsException();
			}
			if (len > 0)
			{
				if (this.doEncode)
				{
					this.baseNCodec.encode(b, offset, len, this.context);
				}
				else
				{
					this.baseNCodec.decode(b, offset, len, this.context);
				}
				this.flush(false);
			}
		}

		// Token: 0x06000109 RID: 265 RVA: 0x0000485C File Offset: 0x00002A5C
		[Throws(new string[] { "java.io.IOException" })]
		[LineNumberTable(new byte[]
		{
			159, 115, 162, 114, 100, 103, 117, 100, 174, 99,
			141
		})]
		[MethodImpl(8)]
		private void flush(bool A_1)
		{
			int num = this.baseNCodec.available(this.context);
			if (num > 0)
			{
				byte[] array = new byte[num];
				int num2 = this.baseNCodec.readResults(array, 0, num, this.context);
				if (num2 > 0)
				{
					this.@out.write(array, 0, num2);
				}
			}
			if (A_1)
			{
				this.@out.flush();
			}
		}

		// Token: 0x0600010A RID: 266 RVA: 0x000048BF File Offset: 0x00002ABF
		[Throws(new string[] { "java.io.IOException" })]
		[LineNumberTable(new byte[] { 82, 105 })]
		[MethodImpl(8)]
		public override void flush()
		{
			this.flush(true);
		}

		// Token: 0x0600010B RID: 267 RVA: 0x000048CC File Offset: 0x00002ACC
		[LineNumberTable(new byte[] { 159, 131, 130, 233, 58, 140, 235, 69, 103, 103 })]
		[MethodImpl(8)]
		public BaseNCodecOutputStream(OutputStream @out, BaseNCodec basedCodec, bool doEncode)
			: base(@out)
		{
			this.singleByte = new byte[1];
			this.context = new BaseNCodec.Context();
			this.baseNCodec = basedCodec;
			this.doEncode = doEncode;
		}

		// Token: 0x0600010C RID: 268 RVA: 0x00004909 File Offset: 0x00002B09
		[Throws(new string[] { "java.io.IOException" })]
		[LineNumberTable(new byte[] { 11, 106, 112 })]
		[MethodImpl(8)]
		public override void write(int i)
		{
			this.singleByte[0] = (byte)((sbyte)i);
			this.write(this.singleByte, 0, 1);
		}

		// Token: 0x0600010D RID: 269 RVA: 0x00004928 File Offset: 0x00002B28
		[Throws(new string[] { "java.io.IOException" })]
		[LineNumberTable(new byte[] { 94, 104, 155, 153, 102, 109 })]
		[MethodImpl(8)]
		public override void close()
		{
			if (this.doEncode)
			{
				this.baseNCodec.encode(this.singleByte, 0, -1, this.context);
			}
			else
			{
				this.baseNCodec.decode(this.singleByte, 0, -1, this.context);
			}
			this.flush();
			this.@out.close();
		}

		// Token: 0x04000077 RID: 119
		[Modifiers(Modifiers.Private | Modifiers.Final)]
		private bool doEncode;

		// Token: 0x04000078 RID: 120
		[Modifiers(Modifiers.Private | Modifiers.Final)]
		private BaseNCodec baseNCodec;

		// Token: 0x04000079 RID: 121
		[Modifiers(Modifiers.Private | Modifiers.Final)]
		private byte[] singleByte;

		// Token: 0x0400007A RID: 122
		[Modifiers(Modifiers.Private | Modifiers.Final)]
		private BaseNCodec.Context context;
	}
}
