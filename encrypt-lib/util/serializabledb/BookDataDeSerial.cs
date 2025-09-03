using System;
using System.Runtime.CompilerServices;
using com.edc.classbook.model;
using com.edc.classbook.util.encryption;
using IKVM.Attributes;
using IKVM.Runtime;
using java.io;
using java.lang;
using java.util;
using java.util.zip;
using javax.crypto;
using javax.crypto.spec;

namespace com.edc.classbook.util.serializabledb
{
	// Token: 0x02000064 RID: 100
	public class BookDataDeSerial : Object
	{
		// Token: 0x06000362 RID: 866 RVA: 0x000124E8 File Offset: 0x000106E8
		[Throws(new string[] { "java.lang.Exception" })]
		[LineNumberTable(new byte[]
		{
			18, 232, 70, 231, 69, 241, 70, 241, 69, 241,
			69, 255, 1, 70, 216, 255, 38, 61, 193, 241,
			58, 98, 216, 255, 25, 61, 161, 255, 24, 76,
			226, 54, 162, 104, 162, 104, 98, 136
		})]
		[MethodImpl(8)]
		public BookDataDeSerial(InputStream @in)
		{
			ObjectInputStream objectInputStream;
			Exception ex2;
			ClassNotFoundException ex5;
			IOException ex7;
			Exception ex10;
			try
			{
				try
				{
					try
					{
						objectInputStream = new ObjectInputStream(@in);
						try
						{
							this.dataMetadata = (Hashtable)objectInputStream.readObject();
							this.dataClickAble = (Hashtable)objectInputStream.readObject();
							this.dataAdditional = (Hashtable)objectInputStream.readObject();
							this.dataBookConfig = (BookConfigModel)objectInputStream.readObject();
						}
						catch (Exception ex)
						{
							ex2 = ByteCodeHelper.MapException<Exception>(ex, ByteCodeHelper.MapFlags.None);
							goto IL_00A0;
						}
						try
						{
							objectInputStream.close();
						}
						catch (Exception ex3)
						{
							if (ByteCodeHelper.MapException<Exception>(ex3, ByteCodeHelper.MapFlags.Unused) == null)
							{
								throw;
							}
						}
						goto IL_00A6;
					}
					catch (ClassNotFoundException ex4)
					{
						ex5 = ByteCodeHelper.MapException<ClassNotFoundException>(ex4, ByteCodeHelper.MapFlags.NoRemapping);
						goto IL_00AB;
					}
				}
				catch (IOException ex6)
				{
					ex7 = ByteCodeHelper.MapException<IOException>(ex6, ByteCodeHelper.MapFlags.NoRemapping);
					goto IL_00B1;
				}
			}
			catch (Exception ex8)
			{
				Exception ex9 = ByteCodeHelper.MapException<Exception>(ex8, ByteCodeHelper.MapFlags.None);
				if (ex9 == null)
				{
					throw;
				}
				ex10 = ex9;
				goto IL_00B8;
			}
			IL_00A0:
			Exception ex11 = ex2;
			Exception ex12;
			ClassNotFoundException ex15;
			IOException ex17;
			Exception ex20;
			try
			{
				ex11 = ex11;
				try
				{
					ex11 = ex11;
					try
					{
						ex12 = ex11;
						try
						{
							objectInputStream.close();
						}
						catch (Exception ex13)
						{
							if (ByteCodeHelper.MapException<Exception>(ex13, ByteCodeHelper.MapFlags.Unused) == null)
							{
								throw;
							}
						}
					}
					catch (ClassNotFoundException ex14)
					{
						ex15 = ByteCodeHelper.MapException<ClassNotFoundException>(ex14, ByteCodeHelper.MapFlags.NoRemapping);
						goto IL_0117;
					}
				}
				catch (IOException ex16)
				{
					ex17 = ByteCodeHelper.MapException<IOException>(ex16, ByteCodeHelper.MapFlags.NoRemapping);
					goto IL_011B;
				}
			}
			catch (Exception ex18)
			{
				Exception ex19 = ByteCodeHelper.MapException<Exception>(ex18, ByteCodeHelper.MapFlags.None);
				if (ex19 == null)
				{
					throw;
				}
				ex20 = ex19;
				goto IL_011F;
			}
			goto IL_0124;
			IL_0117:
			ClassNotFoundException ex21 = ex15;
			goto IL_015D;
			IL_011B:
			IOException ex22 = ex17;
			goto IL_0167;
			IL_011F:
			Exception ex23 = ex20;
			goto IL_0171;
			ClassNotFoundException ex25;
			IOException ex27;
			Exception ex30;
			try
			{
				try
				{
					try
					{
						IL_0124:
						throw Throwable.__<unmap>(ex12);
					}
					catch (ClassNotFoundException ex24)
					{
						ex25 = ByteCodeHelper.MapException<ClassNotFoundException>(ex24, ByteCodeHelper.MapFlags.NoRemapping);
					}
				}
				catch (IOException ex26)
				{
					ex27 = ByteCodeHelper.MapException<IOException>(ex26, ByteCodeHelper.MapFlags.NoRemapping);
					goto IL_0153;
				}
			}
			catch (Exception ex28)
			{
				Exception ex29 = ByteCodeHelper.MapException<Exception>(ex28, ByteCodeHelper.MapFlags.None);
				if (ex29 == null)
				{
					throw;
				}
				ex30 = ex29;
				goto IL_0157;
			}
			ex21 = ex25;
			goto IL_015D;
			IL_0153:
			ex22 = ex27;
			goto IL_0167;
			IL_0157:
			ex23 = ex30;
			goto IL_0171;
			IL_00A6:
			return;
			IL_00AB:
			ex21 = ex5;
			goto IL_015D;
			IL_00B1:
			ex22 = ex7;
			goto IL_0167;
			IL_00B8:
			ex23 = ex10;
			goto IL_0171;
			IL_015D:
			ClassNotFoundException ex31 = ex21;
			throw Throwable.__<unmap>(ex31);
			IL_0167:
			IOException ex32 = ex22;
			throw Throwable.__<unmap>(ex32);
			IL_0171:
			Exception ex33 = ex23;
			throw Throwable.__<unmap>(ex33);
		}

		// Token: 0x06000363 RID: 867 RVA: 0x00012704 File Offset: 0x00010904
		[LineNumberTable(new byte[] { 14, 136 })]
		[MethodImpl(8)]
		public BookDataDeSerial()
		{
		}

		// Token: 0x06000364 RID: 868 RVA: 0x00012710 File Offset: 0x00010910
		[Throws(new string[] { "java.lang.Exception" })]
		[LineNumberTable(new byte[]
		{
			162, 81, 107, 103, 98, 107, 108, 107, 103, 109,
			137, 104, 119, 255, 11, 71, 101, 136
		})]
		[MethodImpl(8)]
		public virtual void readDataInZip()
		{
			ZipFile zipFile = new ZipFile("E:\\TVB\\GK06ANMT10.zip");
			Enumeration enumeration = zipFile.entries();
			while (enumeration.hasMoreElements())
			{
				ZipEntry zipEntry = (ZipEntry)enumeration.nextElement();
				if (!zipEntry.isDirectory())
				{
					string name = zipEntry.getName();
					if (String.instancehelper_endsWith(name, ".clsb"))
					{
						InputStream inputStream = zipFile.getInputStream(zipEntry);
						new BookDataDeSerial(inputStream);
						ArrayList arrayList = (ArrayList)this.dataClickAble.get("199");
						java.lang.System.@out.println(new StringBuilder().append("Total 200 = ").append(arrayList.size()).toString());
					}
				}
			}
			zipFile.close();
		}

		// Token: 0x06000365 RID: 869 RVA: 0x000127C8 File Offset: 0x000109C8
		[LineNumberTable(new byte[]
		{
			82, 135, 166, 109, 220, 226, 61, 129, 203, 109,
			220, 226, 61, 129, 203, 109, 220, 226, 61, 129,
			203, 109, 220, 226, 61, 129, 235, 69, 109, 220,
			226, 61, 129, 203, 109, 220, 226, 61, 129, 203,
			109, 220, 226, 61, 129, 171
		})]
		[MethodImpl(8)]
		private DataModelEnc decryptDataModel(DataModelEnc A_1)
		{
			ClassBookEncryption classBookEncryption = new ClassBookEncryption(1);
			try
			{
				string text = classBookEncryption.decryptString(A_1.getData_index());
				A_1.setData_index(text);
			}
			catch (Exception ex)
			{
				if (ByteCodeHelper.MapException<Exception>(ex, ByteCodeHelper.MapFlags.Unused) == null)
				{
					throw;
				}
				goto IL_0033;
			}
			goto IL_0044;
			IL_0033:
			A_1.setData_index("0");
			try
			{
				IL_0044:
				string text = classBookEncryption.decryptString(A_1.getDescription());
				A_1.setDescription(text);
			}
			catch (Exception ex2)
			{
				if (ByteCodeHelper.MapException<Exception>(ex2, ByteCodeHelper.MapFlags.Unused) == null)
				{
					throw;
				}
				goto IL_006A;
			}
			goto IL_007B;
			IL_006A:
			A_1.setDescription("");
			try
			{
				IL_007B:
				string text = classBookEncryption.decryptString(A_1.getShortDescription());
				A_1.setShortDescription(text);
			}
			catch (Exception ex3)
			{
				if (ByteCodeHelper.MapException<Exception>(ex3, ByteCodeHelper.MapFlags.Unused) == null)
				{
					throw;
				}
				goto IL_00A1;
			}
			goto IL_00B2;
			IL_00A1:
			A_1.setShortDescription("");
			try
			{
				IL_00B2:
				string text = classBookEncryption.decryptString(A_1.getSourceData());
				A_1.setSourceData(text);
			}
			catch (Exception ex4)
			{
				if (ByteCodeHelper.MapException<Exception>(ex4, ByteCodeHelper.MapFlags.Unused) == null)
				{
					throw;
				}
				goto IL_00D8;
			}
			goto IL_00E9;
			IL_00D8:
			A_1.setSourceData("");
			try
			{
				IL_00E9:
				string text = classBookEncryption.decryptString(A_1.getThumbnails());
				A_1.setThumbnails(text);
			}
			catch (Exception ex5)
			{
				if (ByteCodeHelper.MapException<Exception>(ex5, ByteCodeHelper.MapFlags.Unused) == null)
				{
					throw;
				}
				goto IL_010F;
			}
			goto IL_0120;
			IL_010F:
			A_1.setThumbnails("0");
			try
			{
				IL_0120:
				string text = classBookEncryption.decryptString(A_1.getTitle());
				A_1.setTitle(text);
			}
			catch (Exception ex6)
			{
				if (ByteCodeHelper.MapException<Exception>(ex6, ByteCodeHelper.MapFlags.Unused) == null)
				{
					throw;
				}
				goto IL_0146;
			}
			goto IL_0157;
			IL_0146:
			A_1.setTitle("");
			try
			{
				IL_0157:
				string text = classBookEncryption.decryptString(A_1.getType());
				A_1.setType(text);
			}
			catch (Exception ex7)
			{
				if (ByteCodeHelper.MapException<Exception>(ex7, ByteCodeHelper.MapFlags.Unused) == null)
				{
					throw;
				}
				goto IL_017D;
			}
			return A_1;
			IL_017D:
			A_1.setType("");
			return A_1;
		}

		// Token: 0x06000366 RID: 870 RVA: 0x000129BC File Offset: 0x00010BBC
		[Signature("()Ljava/util/ArrayList<Lcom/edc/classbook/model/ClickModel;>;")]
		[LineNumberTable(new byte[]
		{
			160, 166, 230, 69, 113, 102, 104, 140, 114, 255,
			2, 75, 2, 98, 135
		})]
		[MethodImpl(8)]
		public virtual ArrayList getAllClickableData()
		{
			ArrayList arrayList = new ArrayList();
			Exception ex3;
			try
			{
				Iterator iterator = this.dataClickAble.keySet().iterator();
				while (iterator.hasNext())
				{
					string text = Object.instancehelper_toString(iterator.next());
					ArrayList arrayList2 = (ArrayList)this.dataClickAble.get(text);
					arrayList.addAll(arrayList2);
				}
			}
			catch (Exception ex)
			{
				Exception ex2 = ByteCodeHelper.MapException<Exception>(ex, ByteCodeHelper.MapFlags.None);
				if (ex2 == null)
				{
					throw;
				}
				ex3 = ex2;
				goto IL_0060;
			}
			return arrayList;
			IL_0060:
			Exception ex4 = ex3;
			Throwable.instancehelper_printStackTrace(ex4);
			return arrayList;
		}

		// Token: 0x06000367 RID: 871 RVA: 0x00012A4C File Offset: 0x00010C4C
		[LineNumberTable(new byte[] { 160, 199, 104, 127, 7, 162 })]
		[MethodImpl(8)]
		public virtual bool checkClickableData(int page)
		{
			return this.pageObjectsClickable != null && this.pageObjectsClickable.containsKey(new StringBuilder().append("").append(page).toString());
		}

		// Token: 0x06000368 RID: 872 RVA: 0x00012A8C File Offset: 0x00010C8C
		[Signature("()Ljava/util/ArrayList<Lcom/edc/classbook/model/DataModel;>;")]
		[LineNumberTable(new byte[]
		{
			160, 219, 102, 194, 113, 134, 104, 108, 114, 255,
			2, 75, 2, 98, 135
		})]
		[MethodImpl(8)]
		public virtual ArrayList getAllAdditionalData()
		{
			ArrayList arrayList = new ArrayList();
			Exception ex3;
			try
			{
				Iterator iterator = this.dataAdditional.keySet().iterator();
				while (iterator.hasNext())
				{
					string text = Object.instancehelper_toString(iterator.next());
					ArrayList arrayList2 = (ArrayList)this.dataAdditional.get(text);
					arrayList.addAll(arrayList2);
				}
			}
			catch (Exception ex)
			{
				Exception ex2 = ByteCodeHelper.MapException<Exception>(ex, ByteCodeHelper.MapFlags.None);
				if (ex2 == null)
				{
					throw;
				}
				ex3 = ex2;
				goto IL_0062;
			}
			return arrayList;
			IL_0062:
			Exception ex4 = ex3;
			Throwable.instancehelper_printStackTrace(ex4);
			return arrayList;
		}

		// Token: 0x06000369 RID: 873 RVA: 0x00012B1C File Offset: 0x00010D1C
		[LineNumberTable(new byte[] { 160, 251, 104, 127, 7, 162 })]
		[MethodImpl(8)]
		public virtual bool checkAdditionalData(int page)
		{
			return this.pageObjectsAdditional != null && this.pageObjectsAdditional.containsKey(new StringBuilder().append("").append(page).toString());
		}

		// Token: 0x0600036A RID: 874 RVA: 0x00012B5C File Offset: 0x00010D5C
		[Signature("(I)Ljava/util/ArrayList<Lcom/edc/classbook/model/DataModel;>;")]
		[LineNumberTable(new byte[] { 161, 13, 162, 255, 35, 74, 2, 97, 166 })]
		[MethodImpl(8)]
		public virtual ArrayList getAdditionalData(int page_index)
		{
			ArrayList arrayList = null;
			Exception ex3;
			try
			{
				arrayList = (ArrayList)this.dataAdditional.get(new StringBuilder().append("").append(page_index).toString());
			}
			catch (Exception ex)
			{
				Exception ex2 = ByteCodeHelper.MapException<Exception>(ex, ByteCodeHelper.MapFlags.None);
				if (ex2 == null)
				{
					throw;
				}
				ex3 = ex2;
				goto IL_0041;
			}
			return arrayList;
			IL_0041:
			Exception ex4 = ex3;
			Throwable.instancehelper_printStackTrace(ex4);
			return arrayList;
		}

		// Token: 0x0600036B RID: 875 RVA: 0x00012BC8 File Offset: 0x00010DC8
		[Signature("(II)Ljava/util/ArrayList<Lcom/edc/classbook/model/DataModel;>;")]
		[LineNumberTable(new byte[]
		{
			161, 41, 102, 98, 98, 130, 127, 12, 107, 173,
			105, 232, 59, 253, 74, 2, 98, 167
		})]
		[MethodImpl(8)]
		public virtual ArrayList getAdditionalData(int data_type, int page_index)
		{
			ArrayList arrayList = new ArrayList();
			ArrayList arrayList2 = null;
			Exception ex3;
			try
			{
				arrayList2 = (ArrayList)this.dataAdditional.get(new StringBuilder().append("").append(page_index).toString());
				for (int i = 0; i < arrayList2.size(); i++)
				{
					DataModel dataModel = (DataModel)arrayList2.get(i);
					if (dataModel.getType() == data_type)
					{
						arrayList.add(null);
					}
				}
			}
			catch (Exception ex)
			{
				Exception ex2 = ByteCodeHelper.MapException<Exception>(ex, ByteCodeHelper.MapFlags.None);
				if (ex2 == null)
				{
					throw;
				}
				ex3 = ex2;
				goto IL_0079;
			}
			return arrayList2;
			IL_0079:
			Exception ex4 = ex3;
			Throwable.instancehelper_printStackTrace(ex4);
			return arrayList2;
		}

		// Token: 0x0600036C RID: 876 RVA: 0x00012C70 File Offset: 0x00010E70
		public virtual BookConfigModel getBookConfig()
		{
			return this.dataBookConfig;
		}

		// Token: 0x0600036D RID: 877 RVA: 0x00012C78 File Offset: 0x00010E78
		[Signature("()Ljava/util/Hashtable<Ljava/lang/String;Lcom/edc/classbook/model/MetadataModel;>;")]
		public virtual Hashtable getAllMetadata()
		{
			return this.dataMetadata;
		}

		// Token: 0x0600036E RID: 878 RVA: 0x00012C80 File Offset: 0x00010E80
		[LineNumberTable(new byte[] { 161, 94, 162, 146, 124, 97, 102 })]
		[MethodImpl(8)]
		public virtual MetadataModel getMetdata(string key)
		{
			MetadataModel metadataModel2;
			Exception ex3;
			try
			{
				MetadataModel metadataModel = (MetadataModel)this.dataMetadata.get(key);
				metadataModel2 = metadataModel;
			}
			catch (Exception ex)
			{
				Exception ex2 = ByteCodeHelper.MapException<Exception>(ex, ByteCodeHelper.MapFlags.None);
				if (ex2 == null)
				{
					throw;
				}
				ex3 = ex2;
				goto IL_002C;
			}
			return metadataModel2;
			IL_002C:
			Exception ex4 = ex3;
			Throwable.instancehelper_printStackTrace(ex4);
			return new MetadataModel();
		}

		// Token: 0x0600036F RID: 879 RVA: 0x00012CDC File Offset: 0x00010EDC
		[Throws(new string[] { "java.lang.Exception" })]
		[LineNumberTable(new byte[] { 161, 113, 102, 103, 103 })]
		[MethodImpl(8)]
		public virtual byte[] serialize(object obj)
		{
			ByteArrayOutputStream byteArrayOutputStream = new ByteArrayOutputStream();
			ObjectOutputStream objectOutputStream = new ObjectOutputStream(byteArrayOutputStream);
			objectOutputStream.writeObject(obj);
			return byteArrayOutputStream.toByteArray();
		}

		// Token: 0x06000370 RID: 880 RVA: 0x00012D08 File Offset: 0x00010F08
		[Throws(new string[] { "java.lang.Exception" })]
		[LineNumberTable(new byte[] { 161, 126, 103, 103 })]
		[MethodImpl(8)]
		public virtual object deserialize(byte[] data)
		{
			ByteArrayInputStream byteArrayInputStream = new ByteArrayInputStream(data);
			ObjectInputStream objectInputStream = new ObjectInputStream(byteArrayInputStream);
			return objectInputStream.readObject();
		}

		// Token: 0x06000371 RID: 881 RVA: 0x00012D2C File Offset: 0x00010F2C
		[Throws(new string[] { "java.io.IOException" })]
		[LineNumberTable(new byte[]
		{
			161, 144, 109, 130, 103, 106, 210, 99, 184, 2,
			97, 102, 227, 60, 99, 186, 2, 98, 135, 130
		})]
		[MethodImpl(8)]
		public virtual byte[] readFileToByte(File file)
		{
			byte[] array = new byte[(int)file.length()];
			FileInputStream fileInputStream = null;
			try
			{
				fileInputStream = new FileInputStream(file);
				if (fileInputStream.read(array) == -1)
				{
					string text = "EOF reached while trying to read the whole file";
					Throwable.__<suppressFillInStackTrace>();
					throw new IOException(text);
				}
			}
			catch
			{
				IOException ex2;
				try
				{
					if (fileInputStream != null)
					{
						fileInputStream.close();
					}
				}
				catch (IOException ex)
				{
					ex2 = ByteCodeHelper.MapException<IOException>(ex, ByteCodeHelper.MapFlags.NoRemapping);
					goto IL_004A;
				}
				goto IL_0056;
				IL_004A:
				IOException ex3 = ex2;
				Throwable.instancehelper_printStackTrace(ex3);
				IL_0056:
				throw;
			}
			IOException ex5;
			try
			{
				if (fileInputStream != null)
				{
					fileInputStream.close();
				}
			}
			catch (IOException ex4)
			{
				ex5 = ByteCodeHelper.MapException<IOException>(ex4, ByteCodeHelper.MapFlags.NoRemapping);
				goto IL_0072;
			}
			return array;
			IL_0072:
			IOException ex6 = ex5;
			Throwable.instancehelper_printStackTrace(ex6);
			return array;
		}

		// Token: 0x06000372 RID: 882 RVA: 0x00012DE8 File Offset: 0x00010FE8
		[Signature("(Ljava/util/Hashtable<Ljava/lang/String;Ljava/util/ArrayList<Lcom/edc/classbook/model/ClickModel;>;>;)V")]
		public virtual void setDataClickAble(Hashtable dataClickAble)
		{
			this.dataClickAble = dataClickAble;
		}

		// Token: 0x06000373 RID: 883 RVA: 0x00012DF1 File Offset: 0x00010FF1
		[Signature("()Ljava/util/Hashtable<Ljava/lang/String;Ljava/util/ArrayList<Lcom/edc/classbook/model/ClickModel;>;>;")]
		[LineNumberTable(new byte[] { 161, 176, 104, 171 })]
		[MethodImpl(8)]
		public virtual Hashtable getDataClickAble()
		{
			if (this.dataClickAble == null)
			{
				this.dataClickAble = new Hashtable();
			}
			return this.dataClickAble;
		}

		// Token: 0x06000374 RID: 884 RVA: 0x00012E0C File Offset: 0x0001100C
		[Signature("(Ljava/util/Hashtable<Ljava/lang/String;Ljava/util/ArrayList<Lcom/edc/classbook/model/DataModel;>;>;)V")]
		public virtual void setDataAdditional(Hashtable dataAdditional)
		{
			this.dataAdditional = dataAdditional;
		}

		// Token: 0x06000375 RID: 885 RVA: 0x00012E15 File Offset: 0x00011015
		[Signature("()Ljava/util/Hashtable<Ljava/lang/String;Ljava/util/ArrayList<Lcom/edc/classbook/model/DataModel;>;>;")]
		[LineNumberTable(new byte[] { 161, 196, 104, 139 })]
		[MethodImpl(8)]
		public virtual Hashtable getDataAdditional()
		{
			if (this.dataAdditional == null)
			{
				this.dataAdditional = new Hashtable();
			}
			return this.dataAdditional;
		}

		// Token: 0x06000376 RID: 886 RVA: 0x00012E30 File Offset: 0x00011030
		public virtual void setDataBookConfig(BookConfigModel dataBookConfig)
		{
			this.dataBookConfig = dataBookConfig;
		}

		// Token: 0x06000377 RID: 887 RVA: 0x00012E39 File Offset: 0x00011039
		[LineNumberTable(new byte[] { 161, 216, 104, 171 })]
		[MethodImpl(8)]
		public virtual BookConfigModel getDataBookConfig()
		{
			if (this.dataBookConfig == null)
			{
				this.dataBookConfig = new BookConfigModel();
			}
			return this.dataBookConfig;
		}

		// Token: 0x06000378 RID: 888 RVA: 0x00012E54 File Offset: 0x00011054
		[Signature("(Ljava/util/Hashtable<Ljava/lang/String;Lcom/edc/classbook/model/MetadataModel;>;)V")]
		public virtual void setDataMetadata(Hashtable dataMetadata)
		{
			this.dataMetadata = dataMetadata;
		}

		// Token: 0x06000379 RID: 889 RVA: 0x00012E5D File Offset: 0x0001105D
		[Signature("()Ljava/util/Hashtable<Ljava/lang/String;Lcom/edc/classbook/model/MetadataModel;>;")]
		[LineNumberTable(new byte[] { 161, 236, 104, 171 })]
		[MethodImpl(8)]
		public virtual Hashtable getDataMetadata()
		{
			if (this.dataMetadata == null)
			{
				this.dataMetadata = new Hashtable();
			}
			return this.dataMetadata;
		}

		// Token: 0x0600037A RID: 890 RVA: 0x00012E78 File Offset: 0x00011078
		[Throws(new string[] { "java.lang.Exception" })]
		[LineNumberTable(new byte[]
		{
			162, 24, 117, 107, 232, 69, 102, 141, 255, 60,
			70, 233, 56, 233, 78, 140, 105, 104, 169
		})]
		[MethodImpl(8)]
		public virtual void testWriteObject()
		{
			SecretKeySpec secretKeySpec = new SecretKeySpec(String.instancehelper_getBytes("123456"), "RC4");
			Cipher instance = Cipher.getInstance("RC4");
			instance.init(2, secretKeySpec);
			ArrayList arrayList = new ArrayList();
			for (int i = 0; i < 2000; i++)
			{
				ClickModelEnc clickModelEnc = new ClickModelEnc(i, new StringBuilder().append("").append(i).toString(), i, "101.222", "22.222", "100", "200", new StringBuilder().append("additionalsound.mp3").append(i).toString(), "Chao em co gai Lam Hong", "5");
				arrayList.add(clickModelEnc);
			}
			FileOutputStream fileOutputStream = new FileOutputStream("E:/outbyte.clsb");
			ObjectOutputStream objectOutputStream = new ObjectOutputStream(fileOutputStream);
			objectOutputStream.writeObject(arrayList);
			objectOutputStream.close();
		}

		// Token: 0x0600037B RID: 891 RVA: 0x00012F54 File Offset: 0x00011154
		[Throws(new string[] { "java.lang.Exception" })]
		[Signature("(Ljava/lang/String;)Ljava/util/ArrayList<Lcom/edc/classbook/model/ClickModelEnc;>;")]
		[LineNumberTable(new byte[]
		{
			162, 57, 103, 102, 103, 108, 102, 240, 70, 103,
			109, 111, 106, 241, 61, 232, 69, 103, 127, 8
		})]
		[MethodImpl(8)]
		public virtual ArrayList testReadSealedObj(string fileName)
		{
			FileInputStream fileInputStream = new FileInputStream(fileName);
			long num = java.lang.System.currentTimeMillis();
			ObjectInputStream objectInputStream = new ObjectInputStream(fileInputStream);
			ArrayList arrayList = (ArrayList)objectInputStream.readObject();
			objectInputStream.close();
			java.lang.System.@out.println(arrayList.size());
			ArrayList arrayList2 = new ArrayList();
			for (int i = 0; i < arrayList.size(); i++)
			{
				ClickModelEnc clickModelEnc = (ClickModelEnc)arrayList.get(i);
				arrayList2.add(clickModelEnc);
				java.lang.System.@out.println(clickModelEnc.getFile_path());
			}
			long num2 = java.lang.System.currentTimeMillis();
			java.lang.System.@out.println(new StringBuilder().append("Period:").append(num2 - num).toString());
			return arrayList2;
		}

		// Token: 0x0600037C RID: 892 RVA: 0x00013010 File Offset: 0x00011210
		[LineNumberTable(new byte[] { 162, 117, 102, 253, 97, 2, 97, 134 })]
		[MethodImpl(8)]
		public static void main(string[] args)
		{
			Exception ex3;
			try
			{
				BookDataDeSerial bookDataDeSerial = new BookDataDeSerial();
				bookDataDeSerial.readDataInZip();
			}
			catch (Exception ex)
			{
				Exception ex2 = ByteCodeHelper.MapException<Exception>(ex, ByteCodeHelper.MapFlags.None);
				if (ex2 == null)
				{
					throw;
				}
				ex3 = ex2;
				goto IL_0020;
			}
			return;
			IL_0020:
			Exception ex4 = ex3;
			Throwable.instancehelper_printStackTrace(ex4);
		}

		// Token: 0x0400014D RID: 333
		[Signature("Ljava/util/Hashtable<Ljava/lang/String;Ljava/lang/String;>;")]
		private Hashtable pageObjectsClickable;

		// Token: 0x0400014E RID: 334
		[Signature("Ljava/util/Hashtable<Ljava/lang/String;Ljava/util/ArrayList<Lcom/edc/classbook/model/ClickModel;>;>;")]
		private Hashtable dataClickAble;

		// Token: 0x0400014F RID: 335
		[Signature("Ljava/util/Hashtable<Ljava/lang/String;Ljava/lang/String;>;")]
		private Hashtable pageObjectsAdditional;

		// Token: 0x04000150 RID: 336
		[Signature("Ljava/util/Hashtable<Ljava/lang/String;Ljava/util/ArrayList<Lcom/edc/classbook/model/DataModel;>;>;")]
		private Hashtable dataAdditional;

		// Token: 0x04000151 RID: 337
		private BookConfigModel dataBookConfig;

		// Token: 0x04000152 RID: 338
		[Signature("Ljava/util/Hashtable<Ljava/lang/String;Lcom/edc/classbook/model/MetadataModel;>;")]
		private Hashtable dataMetadata;

		// Token: 0x02000065 RID: 101
		[InnerClass(null, (Modifiers)0)]
		[SourceFile("BookDataDeSerial.java")]
		[Modifiers(Modifiers.Super)]
		internal sealed class TestObject : Object
		{
			// Token: 0x0600037D RID: 893 RVA: 0x0001247C File Offset: 0x0001067C
			[LineNumberTable(new byte[] { 161, 249, 143 })]
			[MethodImpl(8)]
			public TestObject(BookDataDeSerial A_1)
			{
			}

			// Token: 0x0600037E RID: 894 RVA: 0x00012490 File Offset: 0x00010690
			[LineNumberTable(new byte[] { 161, 254, 111, 103, 103, 106 })]
			[MethodImpl(8)]
			public TestObject(BookDataDeSerial A_1, string A_2, int A_3, double A_4)
			{
				this.HoTen = A_2;
				this.tuoi = A_3;
				this.x = A_4;
			}

			// Token: 0x0600037F RID: 895 RVA: 0x000124C4 File Offset: 0x000106C4
			public void setHoTen(string A_1)
			{
				this.HoTen = A_1;
			}

			// Token: 0x06000380 RID: 896 RVA: 0x000124CD File Offset: 0x000106CD
			public string getHoTen()
			{
				return this.HoTen;
			}

			// Token: 0x06000381 RID: 897 RVA: 0x000124D5 File Offset: 0x000106D5
			public void setTuoi(int A_1)
			{
				this.tuoi = A_1;
			}

			// Token: 0x06000382 RID: 898 RVA: 0x000124DE File Offset: 0x000106DE
			public int getTuoi()
			{
				return this.tuoi;
			}

			// Token: 0x04000153 RID: 339
			private string HoTen;

			// Token: 0x04000154 RID: 340
			private int tuoi;

			// Token: 0x04000155 RID: 341
			private double x;

			// Token: 0x04000156 RID: 342
			[Modifiers(Modifiers.Final | Modifiers.Synthetic)]
			internal BookDataDeSerial this$0 = A_1;
		}
	}
}
