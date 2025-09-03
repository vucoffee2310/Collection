using System;
using System.Runtime.CompilerServices;
using IKVM.Attributes;
using java.io;
using java.lang;

namespace com.edc.classbook.util.codec.binary
{
	// Token: 0x0200001C RID: 28
	public class BaseNCodecInputStream : FilterInputStream
	{
		// Token: 0x06000100 RID: 256 RVA: 0x00004584 File Offset: 0x00002784
		[Throws(new string[] { "java.io.IOException" })]
		[LineNumberTable(new byte[]
		{
			79, 99, 107, 104, 107, 108, 107, 99, 130, 226,
			81, 102, 115, 122, 111, 104, 150, 180, 154
		})]
		[MethodImpl(8)]
		public override int read(byte[] b, int offset, int len)
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
			if (len == 0)
			{
				return 0;
			}
			int num;
			for (num = 0; num == 0; num = this.baseNCodec.readResults(b, offset, len, this.context))
			{
				if (!this.baseNCodec.hasData(this.context))
				{
					byte[] array = new byte[(!this.doEncode) ? 8192 : 4096];
					int num2 = this.@in.read(array);
					if (this.doEncode)
					{
						this.baseNCodec.encode(array, 0, num2, this.context);
					}
					else
					{
						this.baseNCodec.decode(array, 0, num2, this.context);
					}
				}
			}
			return num;
		}

		// Token: 0x06000101 RID: 257 RVA: 0x00004660 File Offset: 0x00002860
		[LineNumberTable(new byte[] { 159, 131, 98, 233, 59, 140, 203, 103, 103 })]
		[MethodImpl(8)]
		protected internal BaseNCodecInputStream(InputStream @in, BaseNCodec baseNCodec, bool doEncode)
			: base(@in)
		{
			this.singleByte = new byte[1];
			this.context = new BaseNCodec.Context();
			this.doEncode = doEncode;
			this.baseNCodec = baseNCodec;
		}

		// Token: 0x06000102 RID: 258 RVA: 0x0000469D File Offset: 0x0000289D
		[Throws(new string[] { "java.io.IOException" })]
		[LineNumberTable(64)]
		public override int available()
		{
			return (!this.context.eof) ? 1 : 0;
		}

		// Token: 0x06000103 RID: 259 RVA: 0x000046B0 File Offset: 0x000028B0
		[MethodImpl(32)]
		public override void mark(int readLimit)
		{
		}

		// Token: 0x06000104 RID: 260 RVA: 0x000046B2 File Offset: 0x000028B2
		public override bool markSupported()
		{
			return false;
		}

		// Token: 0x06000105 RID: 261 RVA: 0x000046B8 File Offset: 0x000028B8
		[Throws(new string[] { "java.io.IOException" })]
		[LineNumberTable(new byte[] { 47, 111, 99, 145, 100, 105, 143 })]
		[MethodImpl(8)]
		public override int read()
		{
			int num;
			for (num = this.read(this.singleByte, 0, 1); num == 0; num = this.read(this.singleByte, 0, 1))
			{
			}
			if (num > 0)
			{
				int num2 = (int)this.singleByte[0];
				return (num2 >= 0) ? num2 : (256 + num2);
			}
			return -1;
		}

		// Token: 0x06000106 RID: 262 RVA: 0x00004705 File Offset: 0x00002905
		[Throws(new string[] { "java.io.IOException" })]
		[LineNumberTable(181)]
		[MethodImpl(40)]
		public override void reset()
		{
			string text = "mark/reset not supported";
			Throwable.__<suppressFillInStackTrace>();
			throw new IOException(text);
		}

		// Token: 0x06000107 RID: 263 RVA: 0x00004718 File Offset: 0x00002918
		[Throws(new string[] { "java.io.IOException" })]
		[LineNumberTable(new byte[]
		{
			160, 78, 101, 223, 6, 107, 130, 101, 107, 106,
			100, 130, 101, 130
		})]
		[MethodImpl(8)]
		public override long skip(long n)
		{
			if (n < 0L)
			{
				string text = new StringBuilder().append("Negative skip length: ").append(n).toString();
				Throwable.__<suppressFillInStackTrace>();
				throw new IllegalArgumentException(text);
			}
			byte[] array = new byte[512];
			long num;
			int num2;
			for (num = n; num > 0L; num -= (long)num2)
			{
				num2 = (int)Math.min((long)array.Length, num);
				num2 = this.read(array, 0, num2);
				if (num2 == -1)
				{
					break;
				}
			}
			return n - num;
		}

		// Token: 0x04000073 RID: 115
		[Modifiers(Modifiers.Private | Modifiers.Final)]
		private BaseNCodec baseNCodec;

		// Token: 0x04000074 RID: 116
		[Modifiers(Modifiers.Private | Modifiers.Final)]
		private bool doEncode;

		// Token: 0x04000075 RID: 117
		[Modifiers(Modifiers.Private | Modifiers.Final)]
		private byte[] singleByte;

		// Token: 0x04000076 RID: 118
		[Modifiers(Modifiers.Private | Modifiers.Final)]
		private BaseNCodec.Context context;
	}
}
